import { Router } from 'express';
import { run, get } from '../db.js';

const router = Router();

router.post('/initialize', async (req, res) => {
  const { order_id, split_count } = req.body;

  const order = get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });

  const split = split_count || order.split_count || 1;
  const amount = Math.ceil(order.total / split);

  try {
    const Iyzipay = (await import('iyzipay')).default;
    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_BASE_URL
    });

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: order_id,
      price: amount.toString(),
      paidPrice: amount.toString(),
      currency: Iyzipay.CURRENCY.TRY,
      installment: '1',
      basketId: order_id,
      paymentChannel: Iyzipay.PAYMENT_CHANNEL.MOBILE,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      paymentCard: {
        cardHolderName: 'Test User',
        cardNumber: '5528790000000008',
        expireMonth: '12',
        expireYear: '2030',
        cvc: '123',
        registerCard: '0'
      },
      buyer: {
        id: 'BY001', name: 'Test', surname: 'User',
        gsmNumber: '+905551234567', email: 'test@test.com',
        identityNumber: '12345678901', registrationAddress: 'Test Adres',
        city: 'İstanbul', country: 'Turkey'
      },
      shippingAddress: {
        contactName: 'Test User', city: 'İstanbul',
        country: 'Turkey', address: 'Test Adres'
      },
      billingAddress: {
        contactName: 'Test User', city: 'İstanbul',
        country: 'Turkey', address: 'Test Adres'
      },
      basketItems: JSON.parse(order.items).map((item, i) => ({
        id: String(i + 1), name: item.name, category1: 'Menu',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: (item.price * item.qty / split).toFixed(2).toString()
      }))
    };

    iyzipay.payment.create(request, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Ödeme işlemi başarısız', detail: err });
      }
      if (result.status === 'success') {
        run('UPDATE orders SET status = ? WHERE id = ?', ['paid', order_id]);
        res.json({ success: true, message: 'Ödeme başarılı', payment_id: result.paymentId, amount });
      } else {
        res.status(400).json({ success: false, error: result.errorMessage || 'Ödeme başarısız' });
      }
    });
  } catch (err) {
    console.error('Ödeme modülü yüklenemedi, simülasyon:', err.message);
    run('UPDATE orders SET status = ? WHERE id = ?', ['paid', order_id]);
    res.json({
      success: true,
      message: 'Ödeme başarılı (simülasyon)',
      payment_id: 'SIM-' + order_id,
      amount
    });
  }
});

router.post('/split', (req, res) => {
  const { total, split_count } = req.body;

  if (!total || total <= 0) return res.status(400).json({ error: 'Geçersiz tutar' });
  if (!split_count || split_count < 1 || split_count > 4) {
    return res.status(400).json({ error: '1-4 kişi arası bölünebilir' });
  }

  const perPerson = Math.ceil(total / split_count);
  const remainder = total - (perPerson * (split_count - 1));

  const splits = Array.from({ length: split_count }, (_, i) => ({
    person: i + 1,
    amount: i === split_count - 1 ? remainder : perPerson
  }));

  res.json({ total, split_count, per_person: perPerson, splits });
});

export default router;
