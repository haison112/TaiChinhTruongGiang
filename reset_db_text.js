const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.db');
const db = new Database(dbPath);

const defaultContent = {
  seoTitle: 'Nền tảng giao dịch Forex & Prop Firm chuyên nghiệp cho Trader',
  seoDescription: 'Khám phá nền tảng giao dịch tài chính dành cho trader: điều kiện giao dịch minh bạch, công nghệ khớp lệnh nhanh, chương trình cấp vốn Prop Firm.',
  ogImage: '',
  facebookPixelId: '',
  brandName: 'Trường Giang',
  brandColor: '#4B5563',
  heroHeadline: 'Giao dịch Forex và tiếp cận tài khoản cấp vốn trên một hệ sinh thái minh bạch',
  heroSubheadline: 'Trải nghiệm điều kiện giao dịch cạnh tranh, công nghệ khớp lệnh nhanh, chương trình đánh giá trader rõ ràng và hệ thống hỗ trợ được thiết kế cho nhà giao dịch nghiêm túc.',
  heroCta1: 'Bắt đầu giao dịch',
  heroCta2: 'Khám phá chương trình cấp vốn',
  heroImage: '',
  bannerTitle: 'Tải xuống ứng dụng được đánh giá cao của chúng tôi',
  bannerImage: '',
  benefitCards: JSON.stringify([
    { title: 'Không hoa hồng', description: 'Minh bạch chi phí giao dịch.' },
    { title: 'Không báo giá lại', description: 'Điều kiện giao dịch rõ ràng.' },
    { title: 'Khớp lệnh nhanh', description: 'Hạ tầng tối ưu cho trader.' }
  ]),
  processCards: JSON.stringify([
    { title: 'Đăng ký', description: 'Mở tài khoản dễ dàng.' },
    { title: 'Nạp tiền', description: 'Nạp và rút nhanh chóng với đại diện thanh toán địa phương.' },
    { title: 'Giao dịch', description: 'Tham gia cộng đồng trader và theo dõi hiệu suất.' }
  ]),
  faqItems: JSON.stringify([
    { question: 'Forex Broker và Prop Firm khác nhau thế nào?', answer: 'Forex Broker cung cấp môi trường giao dịch, còn Prop Firm cung cấp chương trình đánh giá và cấp vốn theo điều kiện.' },
    { question: 'Giao dịch tài chính có rủi ro không?', answer: 'Có. Forex, CFD và sản phẩm phái sinh có rủi ro cao và không phù hợp với mọi nhà đầu tư.' }
  ]),
  footerBrand: 'Trường Giang',
  footerDisclaimer: 'Giao dịch ngoại hối, CFD và các sản phẩm phái sinh có mức độ rủi ro cao và có thể không phù hợp với mọi nhà đầu tư. Nội dung trên website chỉ nhằm mục đích cung cấp thông tin, không phải lời khuyên đầu tư, không cam kết lợi nhuận và không đảm bảo kết quả giao dịch trong tương lai.',
  zaloUrl: 'https://zalo.me/yourzalo',
  phoneNumber: '19001234'
};

const updateContent = db.prepare('UPDATE content SET value = ? WHERE key = ?');
const insertContent = db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)');

const transaction = db.transaction((updates) => {
  for (const [key, value] of Object.entries(updates)) {
    insertContent.run(key, ''); // Ensures row exists
    updateContent.run(value, key);
  }
});

try {
  transaction(defaultContent);
  console.log('✅ Đã khôi phục và dọn dẹp thành công dữ liệu tiếng Việt chuẩn (UTF-8) vào Database!');
} catch (error) {
  console.error('❌ Lỗi khi cập nhật Database:', error);
}

db.close();
