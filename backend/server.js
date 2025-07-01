// server.js COMPLETO E MELHORADO
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const db = new sqlite3.Database('./database.sqlite');

app.use(cors());
app.use(express.json());

// Cria as tabelas necessárias
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS processos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT,
    partes TEXT,
    status TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS atos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER,
    tipo TEXT,
    texto TEXT,
    data TEXT,
    autor TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS jurisprudencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT,
    tema TEXT,
    texto TEXT,
    autor TEXT,
    tribunal TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mural (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT,
    data TEXT,
    autor TEXT
  )`);
});


// CRUD de Processos
app.get('/processos', (req, res) => {
  db.all('SELECT * FROM processos', (err, rows) => res.json(rows));
});

app.post('/processos', (req, res) => {
  const { numero, partes, status } = req.body;
  db.run('INSERT INTO processos (numero, partes, status) VALUES (?, ?, ?)',
    [numero, partes, status],
    function(err) {
      res.json({ id: this.lastID });
    });
});

app.delete('/processos/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM atos WHERE processo_id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM processos WHERE id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// Atos por Processo
app.get('/processos/:id/atos', (req, res) => {
  db.all('SELECT * FROM atos WHERE processo_id = ?', [req.params.id], (err, rows) => {
    res.json(rows);
  });
});

app.post('/processos/:id/atos', (req, res) => {
  const { tipo, texto, data, autor } = req.body;
  db.run('INSERT INTO atos (processo_id, tipo, texto, data, autor) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, tipo, texto, data, autor],
    function(err) {
      res.json({ id: this.lastID });
    });
});

// DIÁRIO OFICIAL
app.get('/diario', (req, res) => {
  db.all('SELECT * FROM atos ORDER BY data DESC', (err, rows) => res.json(rows));
});

// JURISPRUDÊNCIA
app.get('/juris', (req, res) => {
  const { codigo } = req.query;
  if (codigo) {
    db.all('SELECT * FROM jurisprudencias WHERE codigo LIKE ?', [`%${codigo}%`], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM jurisprudencias ORDER BY id DESC', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

app.post('/juris', (req, res) => {
  const { codigo, tema, texto, autor, tribunal } = req.body;
  db.run(
    'INSERT INTO jurisprudencias (codigo, tema, texto, autor, tribunal) VALUES (?, ?, ?, ?, ?)',
    [codigo, tema, texto, autor, tribunal],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/juris/:id', (req, res) => {
  db.run('DELETE FROM jurisprudencias WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// MURAL CSJ
app.get('/mural', (req, res) => {
  db.all('SELECT * FROM mural ORDER BY data DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/mural', (req, res) => {
  const { texto, autor } = req.body;
  const data = new Date().toISOString();
  db.run('INSERT INTO mural (texto, data, autor) VALUES (?, ?, ?)',
    [texto, data, autor],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// Tabela mural
db.run(`CREATE TABLE IF NOT EXISTS mural (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  texto TEXT,
  autor TEXT,
  data TEXT
)`);

app.get('/mural', (req, res) => {
  db.all('SELECT * FROM mural ORDER BY data DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/mural', (req, res) => {
  const { texto, autor, data } = req.body;
  db.run('INSERT INTO mural (texto, autor, data) VALUES (?, ?, ?)', [texto, autor, data], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Rota para publicar atos sem processo (Diário Oficial)
app.post('/diario/publicar', (req, res) => {
  const { tipo, texto, data, autor } = req.body;
  db.run('INSERT INTO atos (processo_id, tipo, texto, data, autor) VALUES (?, ?, ?, ?, ?)',
    [null, tipo, texto, data, autor],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.delete('/juris/:id', (req, res) => {
  db.run('DELETE FROM jurisprudencias WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/mural/:id', (req, res) => {
  db.run('DELETE FROM mural WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/diario/:id', (req, res) => {
  db.run('DELETE FROM atos WHERE id = ? AND processo_id IS NULL', [req.params.id], function(err) {
    if (err) {
      console.error("Erro ao apagar ato do diário:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Inicia servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
