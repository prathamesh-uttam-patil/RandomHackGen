<h1 align="center">🔮 Random Hack Generator</h1>
<p align="center"><em>AI-powered micro-hacks for your daily life.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Gemini_Flash_2.5-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Frontend-React-black?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Build-Vite-blue?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel" />
</p>

<hr/>

<h2>✨ Overview</h2>
<p>
  A clean, minimalistic web app that generates a <strong>useful hack</strong> (tech, lifestyle, productivity, studies, etc.) using <strong>Gemini Flash AI</strong>.
  The interface is intentionally simple — a bright white canvas, playful doodles, one button, instant results. Detects English or Marathi and replies in the same language.
</p>

<h2>🎨 UI Philosophy</h2>
<ul>
  <li>Minimal, distraction-free</li>
  <li>White, airy background</li>
  <li>Floating doodles at random angles (hover wiggle)</li>
  <li>Center-focused layout</li>
  <li>Dark/Light toggle (top-right)</li>
  <li>Single primary action — <em>Generate Hack</em></li>
</ul>

<h2>⚡ Features</h2>
<ul>
  <li>Fast AI-generated hacks</li>
  <li>Forced JSON output for reliability</li>
  <li>Automatic language detection (English/Marathi)</li>
  <li>Share hack button</li>
  <li>Responsive, mobile-friendly</li>
  <li>Vercel Edge API</li>
</ul>

<h2>🧠 Tech Stack</h2>
<table>
  <tr><td><strong>Frontend</strong></td><td>React + Vite</td></tr>
  <tr><td><strong>Styling</strong></td><td>Tailwind CSS</td></tr>
  <tr><td><strong>Doodles</strong></td><td>Custom animated SVGs</td></tr>
  <tr><td><strong>API</strong></td><td>Vercel Edge Functions</td></tr>
  <tr><td><strong>AI</strong></td><td>Gemini Flash (2.5 Preview)</td></tr>
  <tr><td><strong>Deploy</strong></td><td>Vercel</td></tr>
</table>

<h2>🛠 Installation</h2>
<pre>
git clone &lt;YOUR_REPO_URL&gt;
cd random-hack-generator
npm install
npm run dev
</pre>
<p>App runs at: <code>http://localhost:5173</code></p>

<h2>🔐 Environment Variables</h2>
<pre>
GEMINI_API_KEY=YOUR_KEY_HERE
</pre>
<p>Add the same variable in <strong>Vercel → Project Settings → Environment Variables</strong>.</p>

<h2>🌍 Deployment</h2>
<p>Push to GitHub → Vercel auto-deploys. Or:</p>
<pre>vercel --prod</pre>

<h2>🧭 Roadmap</h2>
<ul>
  <li>Hack history + favorites</li>
  <li>Export as image</li>
  <li>Social share templates</li>
  <li>Daily Hack scheduler</li>
  <li>Mobile app variant</li>
</ul>

<h2>🤝 Contributing</h2>
<p>PRs and suggestions welcome — especially UI/UX polish.</p>

<h2>⭐ Support</h2>
<p>If you like this project, please star the repo.</p>
