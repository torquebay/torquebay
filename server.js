const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = 'https://jyejmnszfbkyeacbhbez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZWptbnN6ZmJreWVhY2JoYmV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0NzU3NywiZXhwIjoyMDY3ODIzNTc3fQ.NiinrkCazEUGla1YwKdQ6N1zO3sbOeA2i08Fe36sRys';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = '8fj3L$92hfm#d8XnqY1^P!rWzVkTbC7Z';

const upload = multer({ storage: multer.memoryStorage() });

// AUTH: Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const { error } = await supabase
    .from('users')
    .insert([{ email, password_hash: hashed, role: 'user' }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Registered' });
});

// AUTH: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return res.status(400).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, data.password_hash);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Upload listing
app.post('/api/listings', auth, upload.single('image'), async (req, res) => {
  const { title, description, price, buyNowPrice } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image required' });

  const fileName = `listings/${Date.now()}_${req.file.originalname}`;
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const imageUrl = `${supabaseUrl}/storage/v1/object/public/images/${fileName}`;

  const { data, error } = await supabase
    .from('listings')
    .insert([{
      user_id: req.user.userId,
      title,
      description,
      price: parseFloat(price),
      buy_now_price: parseFloat(buyNowPrice),
      image_url: imageUrl,
      created_at: new Date().toISOString()
    }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Get all listings
app.get('/api/listings', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Dummy Buy Now
app.post('/api/buy/:id', auth, async (req, res) => {
  res.json({ message: `Buy Now: listing ${req.params.id}` });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server live on port ${port}`));
