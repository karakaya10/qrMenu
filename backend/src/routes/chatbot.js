import { Router } from 'express';
import OpenAI from 'openai';
import { all, run } from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  const { message, session_id } = req.body;

  if (!message || !session_id) {
    return res.status(400).json({ error: 'Mesaj ve oturum ID gerekli' });
  }

  const products = all(`
    SELECT p.name, p.description, p.price, c.name as category
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.is_available = 1
  `);

  const menuText = products.map(p =>
    `- ${p.name} (${p.category}): ${p.price} TL - ${p.description}`
  ).join('\n');

  const history = all(
    'SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY id ASC',
    [session_id]
  );

  const messages = [
    {
      role: 'system',
      content: `Sen bir restoran menü asistanısın. Kullanıcıya menüden seçim yapmasında yardımcı oluyorsun.
Kullanıcı kararsızsa, damak zevkine göre önerilerde bulun.

MENÜ:
${menuText}

Kurallar:
- Kullanıcı bir ürün adı yazarsa, o ürünü sepete eklemesi için yardımcı ol.
- Sade ve net cevaplar ver.
- Fiyat bilgisi verirken TL kullan.
- Ürün önerirken gerekçe belirt.`
    },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  run('INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)',
    [session_id, 'user', message]);

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;
    run('INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)',
      [session_id, 'assistant', reply]);

    res.json({ reply });
  } catch (err) {
    console.error('OpenAI API hatası:', err);

    const fallbackReply = generateFallbackReply(message, products);
    run('INSERT INTO chat_history (session_id, role, content) VALUES (?, ?, ?)',
      [session_id, 'assistant', fallbackReply]);

    res.json({ reply: fallbackReply });
  }
});

function generateFallbackReply(message, products) {
  const msg = message.toLowerCase();

  if (msg.includes('tatlı') || msg.includes('tatli')) {
    const desserts = products.filter(p => p.category === 'Tatlılar');
    if (desserts.length > 0) {
      const rand = desserts[Math.floor(Math.random() * desserts.length)];
      return `Bugün ${rand.name} harika gider! ${rand.description}. Fiyatı: ${rand.price} TL. Sepete eklemek ister misin?`;
    }
  }

  if (msg.includes('kahve') || msg.includes('içecek') || msg.includes('soguk') || msg.includes('soğuk')) {
    const drinks = products.filter(p => p.category === 'Kahveler' || p.category === 'İçecekler');
    if (drinks.length > 0) {
      const rand = drinks[Math.floor(Math.random() * drinks.length)];
      return `En çok tercih edilenlerden ${rand.name} önerebilirim! (${rand.price} TL). ${rand.description}. Denemek ister misin?`;
    }
  }

  if (msg.includes('ne önerirsin') || msg.includes('oner') || msg.includes('kararsız') || msg.includes('kararsiz') || msg.includes('bilmiyorum')) {
    const rand = products[Math.floor(Math.random() * products.length)];
    return `Şiddetle ${rand.name} öneririm! ${rand.category} kategorisinde, ${rand.price} TL. ${rand.description}. Sipariş vermek ister misin?`;
  }

  const matchedProduct = products.find(p =>
    msg.includes(p.name.toLowerCase().replace(/[^a-zçğıöşü]/g, ''))
  );
  if (matchedProduct) {
    return `${matchedProduct.name} mükemmel bir seçim! ${matchedProduct.description}. ${matchedProduct.price} TL. Sepete eklemek için "ekle" yazabilirsin.`;
  }

  return `Size nasıl yardımcı olabilirim? Menümüzde ${products.length} farklı ürün var. İstersen bir öneride bulunayım, ya da aklındaki bir şey varsa söyle.`;
}

export default router;
