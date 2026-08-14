const paymentWebhookService = require('../services/payment-webhook.service');

exports.razorpay = async (req, res, next) => {
  try {
    const signature = req.get('x-razorpay-signature');
    const providerEventId = req.get('x-razorpay-event-id') || null;

    const result = await paymentWebhookService.processRazorpayWebhook({
      rawBody: req.body,
      signature,
      providerEventId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
