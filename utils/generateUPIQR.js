const QRCode = require('qrcode');

const generateUPIQR = async (amount) => {
  const upiString = `upi://pay?pa=restaurant@okhdfcbank&pn=Restaurant&am=${amount}&cu=INR`;
  const qrCodeDataUrl = await QRCode.toDataURL(upiString);
  return { qrCode: qrCodeDataUrl, upiString };
};

module.exports = generateUPIQR;