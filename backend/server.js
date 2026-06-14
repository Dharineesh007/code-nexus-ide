const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // ✨ Added Gemini Import

// --- Imports ---
const connectDB = require('./config/db');
const snippetRoutes = require('./routes/snippetRoutes');
const { executeCode } = require('./controllers/executeController');
const { registerUser, loginUser } = require('./controllers/authController');

dotenv.config();

// --- Initialization ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
connectDB();

// --- Routes ---
// Snippet & Execution Routes
app.use('/api/snippets', snippetRoutes);
app.post('/api/execute', executeCode);

// Authentication Routes
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);

// ==========================================
// ✨ AI AUTO-DEBUGGER ROUTE
// ==========================================
app.post('/api/ai-debug', async (req, res) => {
  try {
    const { code, errorOutput, language } = req.body;
    
    // Safety check to ensure the key is loaded from .env
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY in .env file");
      return res.status(500).json({ suggestion: "API Key is missing from the backend." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert Senior Software Engineer. The user is writing code in ${language}.
      Their code crashed. 
      
      Here is their code:
      ---
      ${code}
      ---
      
      Here is the error output from the console:
      ---
      ${errorOutput}
      ---
      
      Explain exactly why it broke in 2-3 simple sentences. 
      Then, provide the corrected code. Keep it brief and highly helpful.
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    res.json({ suggestion: aiResponse });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ suggestion: "⚠️ The AI failed to process the request. Check backend console for details." });
  }
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});