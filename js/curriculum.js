// Lộ trình HanziGo được biên soạn mới theo nhịp 15 bài/cấp độ.
// Nội dung không sao chép nguyên văn hay tệp âm thanh của bất kỳ giáo trình nào.
const LEVELS = [
  {
    level: 1,
    color: "coral",
    lessons: [
      ["Chào hỏi đầu tiên", "Chào hỏi, giới thiệu và tạm biệt", "是 · 吗 · 的", "你好！你叫什么名字？", "Nǐ hǎo! Nǐ jiào shénme míngzi?", "Xin chào! Bạn tên là gì?", "我叫安。很高兴认识你。", "Wǒ jiào Ān. Hěn gāoxìng rènshi nǐ.", "Mình tên An. Rất vui được gặp bạn."],
      ["Người thân quanh mình", "Gia đình, bạn bè và trường lớp", "的 · 这/那 · 谁", "这是谁？", "Zhè shì shéi?", "Đây là ai?", "这是我姐姐，她也是学生。", "Zhè shì wǒ jiějie, tā yě shì xuésheng.", "Đây là chị mình, chị ấy cũng là học sinh."],
      ["Con số & giờ giấc", "Đếm, hỏi giờ và lịch hẹn", "几 · 多少 · 点", "现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?", "八点半，我们九点上课。", "Bā diǎn bàn, wǒmen jiǔ diǎn shàngkè.", "Tám giờ rưỡi, chín giờ chúng ta học."],
      ["Việc mình làm mỗi ngày", "Những động từ cơ bản thường dùng", "在 · 不 · 也", "你每天做什么？", "Nǐ měitiān zuò shénme?", "Mỗi ngày bạn làm gì?", "我学习汉语，也看书。", "Wǒ xuéxí Hànyǔ, yě kàn shū.", "Mình học tiếng Trung và cũng đọc sách."],
      ["Ăn uống & mua sắm", "Gọi món, đồ uống và giá tiền", "想 · 要 · 多少钱", "你想吃什么？", "Nǐ xiǎng chī shénme?", "Bạn muốn ăn gì?", "我想吃米饭，再喝一杯茶。", "Wǒ xiǎng chī mǐfàn, zài hē yì bēi chá.", "Mình muốn ăn cơm rồi uống một cốc trà."],
      ["Đi đâu, lúc nào?", "Địa điểm, thời gian và thời tiết", "去 · 来 · 怎么样", "今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Thời tiết hôm nay thế nào?", "不冷也不热，我们去公园吧。", "Bù lěng yě bú rè, wǒmen qù gōngyuán ba.", "Không lạnh cũng không nóng, ta đi công viên nhé."],
      ["Bạn sống ở đâu?", "Nhà ở, thành phố và quốc gia", "住在 · 哪儿", "你住在哪儿？", "Nǐ zhù zài nǎr?", "Bạn sống ở đâu?", "我住在河内，离学校不远。", "Wǒ zhù zài Hénèi, lí xuéxiào bù yuǎn.", "Mình sống ở Hà Nội, không xa trường."],
      ["Đi lại trong thành phố", "Xe buýt, tàu điện và chỉ đường", "怎么走 · 坐", "去火车站怎么走？", "Qù huǒchēzhàn zěnme zǒu?", "Đi đến ga tàu thế nào?", "先坐地铁，再走五分钟。", "Xiān zuò dìtiě, zài zǒu wǔ fēnzhōng.", "Đi tàu điện trước, rồi đi bộ năm phút."],
      ["Màu sắc & quần áo", "Miêu tả và chọn đồ", "太…了 · 一点儿", "这件衣服怎么样？", "Zhè jiàn yīfu zěnmeyàng?", "Bộ quần áo này thế nào?", "红色的太大，我想要小一点儿的。", "Hóngsè de tài dà, wǒ xiǎng yào xiǎo yìdiǎnr de.", "Màu đỏ hơi lớn, mình muốn cái nhỏ hơn."],
      ["Sức khỏe cơ bản", "Cơ thể và cảm giác thường gặp", "有点儿 · 得", "你怎么了？", "Nǐ zěnme le?", "Bạn sao vậy?", "我有点儿头疼，今天得休息。", "Wǒ yǒudiǎnr tóuténg, jīntiān děi xiūxi.", "Mình hơi đau đầu, hôm nay phải nghỉ."],
      ["Sở thích của mình", "Thể thao, âm nhạc và cuối tuần", "喜欢 · 会", "你喜欢什么运动？", "Nǐ xǐhuan shénme yùndòng?", "Bạn thích môn thể thao nào?", "我喜欢游泳，也会打篮球。", "Wǒ xǐhuan yóuyǒng, yě huì dǎ lánqiú.", "Mình thích bơi và cũng biết chơi bóng rổ."],
      ["Một ngày ở trường", "Lớp học, môn học và thầy cô", "从…到… · 给", "你几点到学校？", "Nǐ jǐ diǎn dào xuéxiào?", "Mấy giờ bạn đến trường?", "我八点到，老师给我们上汉语课。", "Wǒ bā diǎn dào, lǎoshī gěi wǒmen shàng Hànyǔ kè.", "Mình đến lúc tám giờ, thầy dạy tiếng Trung."],
      ["Gọi điện hẹn gặp", "Số điện thoại và lời mời", "能 · 可以 · 吧", "喂，明天下午能见面吗？", "Wéi, míngtiān xiàwǔ néng jiànmiàn ma?", "A lô, chiều mai gặp được không?", "可以，三点在咖啡店见吧。", "Kěyǐ, sān diǎn zài kāfēidiàn jiàn ba.", "Được, ba giờ gặp ở quán cà phê nhé."],
      ["Chuyến đi đầu tiên", "Khách sạn, vé và hành lý", "要…了 · 已经", "火车要开了，票在哪儿？", "Huǒchē yào kāi le, piào zài nǎr?", "Tàu sắp chạy rồi, vé ở đâu?", "票已经在包里，行李也好了。", "Piào yǐjīng zài bāo lǐ, xíngli yě hǎo le.", "Vé đã ở trong túi, hành lý cũng xong rồi."],
      ["Ôn tập HSK 1", "Tổng hợp giao tiếp sống còn", "Ôn 是/有/在 · câu hỏi", "你学汉语多长时间了？", "Nǐ xué Hànyǔ duō cháng shíjiān le?", "Bạn học tiếng Trung bao lâu rồi?", "三个月了，我现在能说一点儿。", "Sān ge yuè le, wǒ xiànzài néng shuō yìdiǎnr.", "Ba tháng rồi, giờ mình nói được một chút."],
    ],
  },
  {
    level: 2,
    color: "mint",
    lessons: [
      ["Kế hoạch cuối tuần", "Sắp xếp thời gian và rủ bạn", "打算 · 先…再…", "周末你打算做什么？", "Zhōumò nǐ dǎsuàn zuò shénme?", "Cuối tuần bạn định làm gì?", "我先做作业，再跟朋友看电影。", "Wǒ xiān zuò zuòyè, zài gēn péngyou kàn diànyǐng.", "Mình làm bài trước rồi xem phim với bạn."],
      ["Nhà mới của tôi", "Miêu tả phòng và vị trí", "离 · 往 · 旁边", "你的新家离公司远吗？", "Nǐ de xīnjiā lí gōngsī yuǎn ma?", "Nhà mới có xa công ty không?", "不远，地铁站就在旁边。", "Bù yuǎn, dìtiězhàn jiù zài pángbiān.", "Không xa, ga tàu điện ngay bên cạnh."],
      ["Bữa ăn đáng nhớ", "Hương vị và trải nghiệm", "又…又… · 过", "你吃过北京烤鸭吗？", "Nǐ chīguo Běijīng kǎoyā ma?", "Bạn từng ăn vịt quay Bắc Kinh chưa?", "吃过，又香又好吃。", "Chīguo, yòu xiāng yòu hǎochī.", "Rồi, vừa thơm vừa ngon."],
      ["Mua sắm thông minh", "So sánh và đổi trả", "比 · 更 · 最", "这两双鞋哪双更舒服？", "Zhè liǎng shuāng xié nǎ shuāng gèng shūfu?", "Hai đôi giày này đôi nào thoải mái hơn?", "黑色的比白色的便宜。", "Hēisè de bǐ báisè de piányi.", "Đôi đen rẻ hơn đôi trắng."],
      ["Thời tiết bốn mùa", "Dự báo và chuẩn bị", "虽然…但是…", "明天可能下雪。", "Míngtiān kěnéng xiàxuě.", "Ngày mai có thể có tuyết.", "虽然很冷，但是我想出去拍照。", "Suīrán hěn lěng, dànshì wǒ xiǎng chūqù pāizhào.", "Dù rất lạnh nhưng mình muốn ra ngoài chụp ảnh."],
      ["Ở phòng khám", "Triệu chứng và lời khuyên", "应该 · 别 · 多", "医生，我咳嗽得很厉害。", "Yīshēng, wǒ késou de hěn lìhai.", "Bác sĩ, tôi ho rất nặng.", "你应该多喝水，别熬夜。", "Nǐ yīnggāi duō hē shuǐ, bié áoyè.", "Bạn nên uống nhiều nước, đừng thức khuya."],
      ["Một ngày bận rộn", "Việc đã hoàn thành", "把 · 完 · 好", "报告写完了吗？", "Bàogào xiěwán le ma?", "Báo cáo viết xong chưa?", "我把报告写好了，马上发给你。", "Wǒ bǎ bàogào xiěhǎo le, mǎshàng fā gěi nǐ.", "Mình viết xong rồi, gửi bạn ngay."],
      ["Học một kỹ năng mới", "Quá trình và tiến bộ", "越来越 · 得", "你的汉语说得越来越好了。", "Nǐ de Hànyǔ shuō de yuèláiyuè hǎo le.", "Tiếng Trung của bạn ngày càng tốt.", "谢谢，我每天都练习半小时。", "Xièxie, wǒ měitiān dōu liànxí bàn xiǎoshí.", "Cảm ơn, ngày nào mình cũng luyện nửa giờ."],
      ["Du lịch tự túc", "Hỏi thông tin và xử lý sự cố", "如果…就…", "如果迷路了怎么办？", "Rúguǒ mílù le zěnme bàn?", "Nếu lạc đường thì làm sao?", "就用地图，或者问警察。", "Jiù yòng dìtú, huòzhě wèn jǐngchá.", "Dùng bản đồ hoặc hỏi cảnh sát."],
      ["Sinh nhật bất ngờ", "Quà tặng và lời chúc", "是…的 · 为了", "这个蛋糕是谁做的？", "Zhège dàngāo shì shéi zuò de?", "Chiếc bánh này ai làm?", "是我们为了你一起做的。", "Shì wǒmen wèile nǐ yìqǐ zuò de.", "Chúng mình cùng làm cho bạn."],
      ["Kể một câu chuyện", "Trình tự sự việc", "一边…一边… · 突然", "我一边走路一边听音乐。", "Wǒ yìbiān zǒulù yìbiān tīng yīnyuè.", "Mình vừa đi vừa nghe nhạc.", "突然下雨了，我跑进一家店。", "Tūrán xiàyǔ le, wǒ pǎo jìn yì jiā diàn.", "Đột nhiên mưa, mình chạy vào một cửa hàng."],
      ["Công nghệ quanh ta", "Điện thoại, mạng và ứng dụng", "被 · 让", "我的手机被弟弟拿走了。", "Wǒ de shǒujī bèi dìdi ná zǒu le.", "Điện thoại bị em trai cầm đi.", "让他快点儿还给你吧。", "Ràng tā kuàidiǎnr huán gěi nǐ ba.", "Bảo em ấy trả bạn nhanh đi."],
      ["Tìm việc làm thêm", "Kinh nghiệm và lịch làm", "除了…以外…还…", "除了周末以外，你还有时间吗？", "Chúle zhōumò yǐwài, nǐ hái yǒu shíjiān ma?", "Ngoài cuối tuần bạn còn thời gian không?", "星期三晚上也可以。", "Xīngqīsān wǎnshang yě kěyǐ.", "Tối thứ Tư cũng được."],
      ["Giữ môi trường xanh", "Thói quen thân thiện môi trường", "为了 · 少…多…", "为了保护环境，我们能做什么？", "Wèile bǎohù huánjìng, wǒmen néng zuò shénme?", "Để bảo vệ môi trường ta làm gì được?", "少用塑料袋，多坐公共汽车。", "Shǎo yòng sùliàodài, duō zuò gōnggòng qìchē.", "Dùng ít túi nhựa, đi xe công cộng nhiều hơn."],
      ["Ôn tập HSK 2", "Tổng hợp hội thoại đời sống", "Ôn bổ ngữ · so sánh · liên từ", "这半年你最大的变化是什么？", "Zhè bànnián nǐ zuì dà de biànhuà shì shénme?", "Nửa năm qua thay đổi lớn nhất là gì?", "我更自信了，也认识了很多朋友。", "Wǒ gèng zìxìn le, yě rènshi le hěn duō péngyou.", "Mình tự tin hơn và quen nhiều bạn."],
    ],
  },
  {
    level: 3,
    color: "gold",
    lessons: [
      ["Ấn tượng đầu tiên", "Miêu tả tính cách và ngoại hình", "看起来 · 给…留下", "新同事给你留下什么印象？", "Xīn tóngshì gěi nǐ liúxià shénme yìnxiàng?", "Đồng nghiệp mới để lại ấn tượng gì?", "他看起来很认真，也很有礼貌。", "Tā kànqǐlái hěn rènzhēn, yě hěn yǒu lǐmào.", "Anh ấy có vẻ nghiêm túc và lịch sự."],
      ["Thói quen hiệu quả", "Quản lý thời gian và mục tiêu", "只要…就… · 坚持", "你怎么保持学习习惯？", "Nǐ zěnme bǎochí xuéxí xíguàn?", "Bạn duy trì thói quen học thế nào?", "只要每天坚持，我就会进步。", "Zhǐyào měitiān jiānchí, wǒ jiù huì jìnbù.", "Chỉ cần kiên trì mỗi ngày mình sẽ tiến bộ."],
      ["Một quyết định khó", "Nêu lựa chọn và lý do", "与其…不如…", "你决定留学还是工作？", "Nǐ juédìng liúxué háishi gōngzuò?", "Bạn quyết định du học hay làm việc?", "与其马上工作，不如先继续学习。", "Yǔqí mǎshàng gōngzuò, bùrú xiān jìxù xuéxí.", "Thay vì đi làm ngay, nên học tiếp trước."],
      ["Văn hóa trên bàn ăn", "Phép lịch sự và khác biệt", "对于 · 来说", "对于客人来说，要注意什么？", "Duìyú kèrén láishuō, yào zhùyì shénme?", "Với khách thì cần chú ý gì?", "等大家到齐以后再开始吃。", "Děng dàjiā dào qí yǐhòu zài kāishǐ chī.", "Đợi đủ mọi người rồi mới bắt đầu ăn."],
      ["Tin tức mỗi ngày", "Tóm tắt và bày tỏ quan điểm", "据说 · 对…有看法", "据说明年会开新的地铁线。", "Jùshuō míngnián huì kāi xīn de dìtiě xiàn.", "Nghe nói năm sau mở tuyến tàu mới.", "我觉得这对城市发展很重要。", "Wǒ juéde zhè duì chéngshì fāzhǎn hěn zhòngyào.", "Mình thấy điều này quan trọng với thành phố."],
      ["Giải quyết hiểu lầm", "Giải thích và xin lỗi", "原来 · 其实 · 并不是", "你为什么没参加会议？", "Nǐ wèishénme méi cānjiā huìyì?", "Sao bạn không dự họp?", "其实我没收到通知，并不是不想来。", "Qíshí wǒ méi shōudào tōngzhī, bìng bú shì bù xiǎng lái.", "Thật ra mình không nhận thông báo, không phải không muốn đến."],
      ["Trải nghiệm đáng nhớ", "Kể lại chi tiết và cảm xúc", "直到…才… · 终于", "旅行中最难忘的是什么？", "Lǚxíng zhōng zuì nánwàng de shì shénme?", "Điều đáng nhớ nhất khi du lịch là gì?", "我们直到山顶才看到日出，终于成功了。", "Wǒmen zhídào shāndǐng cái kàndào rìchū, zhōngyú chénggōng le.", "Tới đỉnh mới thấy bình minh, cuối cùng đã thành công."],
      ["Sống khỏe lâu dài", "Cân bằng thể chất và tinh thần", "不仅…而且…", "运动有什么好处？", "Yùndòng yǒu shénme hǎochu?", "Vận động có lợi gì?", "不仅让身体健康，而且能减轻压力。", "Bùjǐn ràng shēntǐ jiànkāng, érqiě néng jiǎnqīng yālì.", "Không chỉ khỏe người mà còn giảm áp lực."],
      ["Thành phố tương lai", "Dự đoán và nêu khả năng", "随着 · 将会", "未来的城市会是什么样？", "Wèilái de chéngshì huì shì shénme yàng?", "Thành phố tương lai sẽ ra sao?", "随着科技发展，交通将会更方便。", "Suízhe kējì fāzhǎn, jiāotōng jiānghuì gèng fāngbiàn.", "Theo sự phát triển công nghệ, giao thông sẽ tiện hơn."],
      ["Bảo vệ thiên nhiên", "Nguyên nhân, hậu quả và giải pháp", "由于 · 因此", "为什么这里的空气变差了？", "Wèishénme zhèlǐ de kōngqì biàn chà le?", "Sao không khí ở đây tệ đi?", "由于汽车增加，因此污染更严重。", "Yóuyú qìchē zēngjiā, yīncǐ wūrǎn gèng yánzhòng.", "Do xe tăng nên ô nhiễm nghiêm trọng hơn."],
      ["Làm việc theo nhóm", "Phân công và phản hồi", "由 · 负责 · 互相", "这个项目由谁负责？", "Zhège xiàngmù yóu shéi fùzé?", "Dự án này do ai phụ trách?", "我负责计划，大家互相帮助。", "Wǒ fùzé jìhuà, dàjiā hùxiāng bāngzhù.", "Mình phụ trách kế hoạch, mọi người giúp nhau."],
      ["Nghệ thuật & sáng tạo", "Cảm nhận tác phẩm", "无论…都…", "你为什么喜欢这幅画？", "Nǐ wèishénme xǐhuan zhè fú huà?", "Sao bạn thích bức tranh này?", "无论看多少次，我都觉得很有意思。", "Wúlùn kàn duōshao cì, wǒ dōu juéde hěn yǒuyìsi.", "Dù xem bao lần mình vẫn thấy thú vị."],
      ["Dịch vụ & khiếu nại", "Trình bày vấn đề lịch sự", "既然…就… · 要求", "这个房间跟照片不一样。", "Zhège fángjiān gēn zhàopiàn bù yíyàng.", "Phòng này không giống ảnh.", "既然不能更换，我要求退款。", "Jìrán bù néng gēnghuàn, wǒ yāoqiú tuìkuǎn.", "Nếu không đổi được, tôi yêu cầu hoàn tiền."],
      ["Bài phát biểu ngắn", "Mở bài, chuyển ý và kết luận", "首先 · 其次 · 总之", "请谈谈你的学习方法。", "Qǐng tántan nǐ de xuéxí fāngfǎ.", "Hãy nói về cách học của bạn.", "首先定目标，其次多练习，总之要坚持。", "Shǒuxiān dìng mùbiāo, qícì duō liànxí, zǒngzhī yào jiānchí.", "Đầu tiên đặt mục tiêu, tiếp theo luyện nhiều, nói chung cần kiên trì."],
      ["Ôn tập HSK 3", "Tổng hợp nghe–nói–đọc–viết", "Ôn câu phức và liên kết ý", "学完这个阶段，你有什么收获？", "Xuéwán zhège jiēduàn, nǐ yǒu shénme shōuhuò?", "Học xong giai đoạn này bạn thu được gì?", "我能听懂更多，也敢用汉语表达想法。", "Wǒ néng tīngdǒng gèng duō, yě gǎn yòng Hànyǔ biǎodá xiǎngfǎ.", "Mình nghe hiểu hơn và dám diễn đạt bằng tiếng Trung."],
    ],
  },
];

const EMOJIS = ["👋", "🏡", "⏰", "📖", "🥟", "🌤️", "📍", "🚇", "👕", "🩺", "🏀", "🏫", "☎️", "🧳", "🏆"];

export const COURSE_LESSONS = LEVELS.flatMap(({ level, color, lessons }) =>
  lessons.map((row, index) => ({
    id: (level - 1) * 15 + index + 1,
    level,
    unit: index + 1,
    title: row[0],
    subtitle: row[1],
    grammar: row[2],
    emoji: EMOJIS[index],
    color,
    dialogue: [
      { speaker: "A", hanzi: row[3], pinyin: row[4], meaning: row[5] },
      { speaker: "B", hanzi: row[6], pinyin: row[7], meaning: row[8] },
    ],
  })),
);

const EXTRA_PACKS = [
  "住|zhù|sống;城市|chéngshì|thành phố;附近|fùjìn|gần đây;远|yuǎn|xa",
  "火车站|huǒchēzhàn|ga tàu;地铁|dìtiě|tàu điện;先|xiān|trước tiên;分钟|fēnzhōng|phút",
  "衣服|yīfu|quần áo;红色|hóngsè|màu đỏ;件|jiàn|lượng từ quần áo;一点儿|yìdiǎnr|một chút",
  "头疼|tóuténg|đau đầu;休息|xiūxi|nghỉ ngơi;身体|shēntǐ|cơ thể;药|yào|thuốc",
  "运动|yùndòng|thể thao;游泳|yóuyǒng|bơi;篮球|lánqiú|bóng rổ;音乐|yīnyuè|âm nhạc",
  "上课|shàngkè|lên lớp;作业|zuòyè|bài tập;教室|jiàoshì|phòng học;给|gěi|cho",
  "电话|diànhuà|điện thoại;见面|jiànmiàn|gặp mặt;下午|xiàwǔ|buổi chiều;咖啡店|kāfēidiàn|quán cà phê",
  "票|piào|vé;行李|xíngli|hành lý;包|bāo|túi;已经|yǐjīng|đã",
  "时间|shíjiān|thời gian;月|yuè|tháng;说|shuō|nói;一点儿|yìdiǎnr|một chút",
  "周末|zhōumò|cuối tuần;打算|dǎsuàn|dự định;电影|diànyǐng|phim;跟|gēn|cùng với",
  "新家|xīnjiā|nhà mới;公司|gōngsī|công ty;旁边|pángbiān|bên cạnh;离|lí|cách",
  "烤鸭|kǎoyā|vịt quay;吃过|chīguo|đã từng ăn;香|xiāng|thơm;好吃|hǎochī|ngon",
  "双|shuāng|đôi;鞋|xié|giày;舒服|shūfu|thoải mái;便宜|piányi|rẻ",
  "可能|kěnéng|có thể;下雪|xiàxuě|tuyết rơi;虽然|suīrán|mặc dù;拍照|pāizhào|chụp ảnh",
  "医生|yīshēng|bác sĩ;咳嗽|késou|ho;厉害|lìhai|nghiêm trọng;应该|yīnggāi|nên",
  "报告|bàogào|báo cáo;写完|xiěwán|viết xong;马上|mǎshàng|ngay lập tức;发|fā|gửi",
  "越来越|yuèláiyuè|ngày càng;练习|liànxí|luyện tập;进步|jìnbù|tiến bộ;小时|xiǎoshí|giờ",
  "迷路|mílù|lạc đường;地图|dìtú|bản đồ;或者|huòzhě|hoặc;警察|jǐngchá|cảnh sát",
  "蛋糕|dàngāo|bánh ngọt;为了|wèile|để;一起|yìqǐ|cùng nhau;礼物|lǐwù|quà",
  "一边|yìbiān|vừa;突然|tūrán|đột nhiên;跑|pǎo|chạy;故事|gùshi|câu chuyện",
  "手机|shǒujī|điện thoại;拿走|ná zǒu|cầm đi;还给|huán gěi|trả lại;网络|wǎngluò|mạng",
  "除了|chúle|ngoài ra;工作|gōngzuò|công việc;经验|jīngyàn|kinh nghiệm;安排|ānpái|sắp xếp",
  "保护|bǎohù|bảo vệ;环境|huánjìng|môi trường;塑料袋|sùliàodài|túi nhựa;公共汽车|gōnggòng qìchē|xe buýt",
  "变化|biànhuà|thay đổi;自信|zìxìn|tự tin;认识|rènshi|quen biết;半年|bànnián|nửa năm",
  "印象|yìnxiàng|ấn tượng;同事|tóngshì|đồng nghiệp;认真|rènzhēn|nghiêm túc;礼貌|lǐmào|lịch sự",
  "保持|bǎochí|duy trì;习惯|xíguàn|thói quen;坚持|jiānchí|kiên trì;目标|mùbiāo|mục tiêu",
  "决定|juédìng|quyết định;留学|liúxué|du học;与其|yǔqí|thay vì;继续|jìxù|tiếp tục",
  "文化|wénhuà|văn hóa;客人|kèrén|khách;注意|zhùyì|chú ý;到齐|dào qí|đến đủ",
  "新闻|xīnwén|tin tức;据说|jùshuō|nghe nói;发展|fāzhǎn|phát triển;重要|zhòngyào|quan trọng",
  "误会|wùhuì|hiểu lầm;其实|qíshí|thật ra;通知|tōngzhī|thông báo;解释|jiěshì|giải thích",
  "难忘|nánwàng|khó quên;山顶|shāndǐng|đỉnh núi;日出|rìchū|bình minh;终于|zhōngyú|cuối cùng",
  "健康|jiànkāng|sức khỏe;好处|hǎochu|lợi ích;减轻|jiǎnqīng|giảm bớt;压力|yālì|áp lực",
  "未来|wèilái|tương lai;随着|suízhe|cùng với;科技|kējì|công nghệ;方便|fāngbiàn|thuận tiện",
  "空气|kōngqì|không khí;由于|yóuyú|do;污染|wūrǎn|ô nhiễm;严重|yánzhòng|nghiêm trọng",
  "项目|xiàngmù|dự án;负责|fùzé|phụ trách;计划|jìhuà|kế hoạch;互相|hùxiāng|lẫn nhau",
  "艺术|yìshù|nghệ thuật;幅|fú|lượng từ tranh;无论|wúlùn|bất kể;有意思|yǒuyìsi|thú vị",
  "服务|fúwù|dịch vụ;更换|gēnghuàn|đổi;要求|yāoqiú|yêu cầu;退款|tuìkuǎn|hoàn tiền",
  "首先|shǒuxiān|đầu tiên;其次|qícì|tiếp theo;总之|zǒngzhī|nói chung;方法|fāngfǎ|phương pháp",
  "阶段|jiēduàn|giai đoạn;收获|shōuhuò|thu hoạch;听懂|tīngdǒng|nghe hiểu;表达|biǎodá|biểu đạt",
];

export const EXTRA_VOCABULARY = EXTRA_PACKS.flatMap((pack, packIndex) => {
  const lesson = packIndex + 7;
  const course = COURSE_LESSONS.find((item) => item.id === lesson);
  return pack.split(";").map((raw, wordIndex) => {
    const [hanzi, pinyin, meaning] = raw.split("|");
    return {
      id: `l${lesson}-extra-${wordIndex + 1}`,
      lesson,
      hanzi,
      pinyin,
      meaning,
      example: course.dialogue[wordIndex % 2].hanzi,
      examplePinyin: course.dialogue[wordIndex % 2].pinyin,
      exampleMeaning: course.dialogue[wordIndex % 2].meaning,
    };
  });
});

export function getCourseLesson(lessonId) {
  return COURSE_LESSONS.find((lesson) => lesson.id === Number(lessonId));
}
