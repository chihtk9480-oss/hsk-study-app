# HanziGo — học HSK mỗi ngày

HanziGo là ứng dụng web HSK 1 bằng tiếng Việt, thiết kế ưu tiên điện thoại và có thể cài như một ứng dụng PWA. Bản đầu dùng bộ khởi động 72 từ/cụm từ nền tảng, không tự nhận là toàn bộ danh mục chính thức của một phiên bản kỳ thi HSK cụ thể.

## Có gì trong app?

- 6 bài học theo chủ đề, mỗi bài 12 thẻ.
- Flashcard lật thẻ, phát âm tiếng Hoa bằng giọng có sẵn trên thiết bị.
- Ôn cách quãng theo mức “Quên rồi / Hơi khó / Nhớ rồi”.
- Quiz 10 câu đan xen chọn nghĩa, nhận mặt chữ và luyện nghe.
- Kho từ có tìm kiếm, lọc theo bài và đánh dấu yêu thích.
- Bảng luyện viết hỗ trợ chuột và cảm ứng.
- Mục tiêu hằng ngày, streak, XP, thống kê và chế độ tối.
- Lưu tiến độ bằng `localStorage`; học offline bằng service worker.
- Không cần đăng nhập, không thu thập dữ liệu và không gọi API bên ngoài.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm start
```

Mở `http://localhost:4173`. Chạy kiểm thử bằng:

```bash
npm test
```

## Đưa lên GitHub Pages

Workflow `.github/workflows/pages.yml` đã được chuẩn bị sẵn theo cấu hình GitHub Pages hiện hành.

1. Tạo repository và đưa toàn bộ dự án lên nhánh `main`.
2. Vào **Settings → Pages**.
3. Ở **Build and deployment → Source**, chọn **GitHub Actions**.
4. Workflow `Test and deploy HanziGo` sẽ kiểm thử rồi xuất bản website.

Với repo `chihtk9480-oss/hsk-study-app`, địa chỉ mặc định sẽ là:

`https://chihtk9480-oss.github.io/hsk-study-app/`

## Cấu trúc

```text
.
├── .github/workflows/pages.yml
├── assets/
├── js/
│   ├── app.js
│   └── data.js
├── tests/
├── index.html
├── styles.css
├── manifest.webmanifest
└── sw.js
```

## Lưu ý nội dung

Nội dung từ vựng và câu ví dụ trong MVP cần được giáo viên/người có chuyên môn tiếng Trung duyệt thêm trước khi dùng như học liệu chính thức hoặc mở rộng thành ngân hàng đề thi.

## Giấy phép

MIT
