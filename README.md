# HanziGo — học HSK mỗi ngày

HanziGo là ứng dụng web học HSK 1–3 bằng tiếng Việt, thiết kế ưu tiên điện thoại và có thể cài như một ứng dụng PWA. Lộ trình gồm 45 bài và 228 từ/cụm từ, được biên soạn mới theo độ khó tăng dần.

## Có gì trong app?

- 45 bài học: 15 bài cho mỗi cấp HSK 1, HSK 2 và HSK 3.
- Mỗi bài có khu luyện nghe, nói, đọc và viết; hội thoại, điểm ngữ pháp và từ vựng theo chủ đề.
- Phát âm tiếng Trung, luyện nói bằng nhận dạng giọng nói trên trình duyệt hỗ trợ.
- Phòng luyện viết theo đủ 45 bài; từ nhiều chữ được tách để luyện lần lượt từng chữ, có thứ tự nét động.
- Trung tâm luyện thi gồm 60 đề: 30 đề tổng ôn phủ 100% từ vựng và 30 đề thi thử tự biên soạn bám cấu trúc HSK 1–3 chính thức.
- Thi thử HSK 1: 40 câu Nghe–Đọc; HSK 2: 60 câu Nghe–Đọc; HSK 3: 80 câu Nghe–Đọc–Viết; có đồng hồ và chấm từng kỹ năng trên thang 100.
- Flashcard lật thẻ, phát âm tiếng Hoa bằng giọng có sẵn trên thiết bị.
- Ôn cách quãng theo mức “Quên rồi / Hơi khó / Nhớ rồi”.
- Quiz 10 câu đan xen chọn nghĩa, nhận mặt chữ và luyện nghe.
- Kho từ có tìm kiếm, lọc theo bài và đánh dấu yêu thích.
- Bảng luyện viết hỗ trợ chuột và cảm ứng.
- Mục tiêu hằng ngày, streak, XP, thống kê và chế độ tối.
- Lưu tiến độ bằng `localStorage`; học offline bằng service worker.
- Không cần đăng nhập và không thu thập dữ liệu học tập; tiến độ được lưu ngay trên thiết bị.
- Âm thanh sử dụng giọng đọc có sẵn trên thiết bị. Dữ liệu nét chữ được tải khi dùng lần đầu.

## Nội dung

Nội dung hội thoại, ví dụ và bài tập trong ứng dụng được biên soạn riêng, không sao chép nguyên văn hay sử dụng audio của một giáo trình thương mại. Cấu trúc bám sát bốn kỹ năng và mức độ HSK để người học có trải nghiệm quen thuộc như một giáo trình số.

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
