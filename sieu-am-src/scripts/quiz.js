/* ============================================================
   QUIZ — 15 câu trắc nghiệm củng cố cuối giờ
   ============================================================ */
(function () {
  const el = $('.lab[data-widget="quiz"]'); if (!el) return;
  const QS = [
    {
      q: 'Siêu âm là gì?',
      o: ['Sóng điện từ có tần số trên 20 kHz', 'Sóng cơ học có tần số trên 20 kHz', 'Sóng âm có tần số dưới 16 Hz', 'Chùm tia mang năng lượng ion hoá'],
      a: 1,
      why: 'Siêu âm là sóng cơ học có tần số lớn hơn giới hạn nghe 20 kHz của tai người và không truyền được trong chân không.'
    },
    {
      q: 'Hiệu ứng áp điện trong đầu dò siêu âm cho phép',
      o: ['Chỉ phát sóng, không thu được', 'Chuyển đổi hai chiều điện năng ↔ cơ năng', 'Làm tăng tần số sóng lên gấp đôi', 'Loại bỏ hoàn toàn sự hấp thụ trong mô'],
      a: 1,
      why: 'Bản tinh thể thạch anh hoặc gốm áp điện PZT biến dạng khi đặt điện áp xoay chiều (phát sóng) và sinh ra điện áp khi chịu tác dụng của sóng phản xạ (thu sóng).'
    },
    {
      q: 'Vì sao phải bôi lớp gel lên bề mặt da trước khi đặt đầu dò siêu âm?',
      o: ['Để diệt khuẩn bề mặt da', 'Để loại bỏ lớp không khí ở giữa — không khí phản xạ tới 99,95% sóng', 'Để hạ nhiệt độ cho đầu dò', 'Để tăng tốc độ truyền sóng lên gấp 4 lần'],
      a: 1,
      why: 'Không khí có trở kháng âm rất nhỏ so với mô mềm nên gần như toàn bộ sóng bị phản xạ trở lại; lớp gel giúp phối hợp trở kháng tiếp âm.'
    },
    {
      q: 'Sóng siêu âm tần số 5 MHz truyền trong mô mềm (v = 1500 m/s) có bước sóng bằng',
      o: ['0,15 mm', '0,30 mm', '0,75 mm', '1,50 mm'],
      a: 1,
      why: 'λ = v / f = 1500 / (5 × 10⁶) = 3 × 10⁻⁴ m = 0,30 mm.'
    },
    {
      q: 'Máy siêu âm thu được xung phản xạ sau 0,10 ms kể từ lúc phát (lấy v = 1500 m/s). Độ sâu của mặt phản xạ là',
      o: ['3,75 cm', '7,5 cm', '15 cm', '75 cm'],
      a: 1,
      why: 'd = v · Δt / 2 = 1500 × 0,0001 / 2 = 0,075 m = 7,5 cm (chia 2 do sóng truyền theo cả lượt đi và lượt về).'
    },
    {
      q: 'Khi siêu âm thai nhi qua thành bụng (độ sâu khoảng 8–12 cm), bác sĩ nên chọn loại đầu dò nào?',
      o: ['Đầu dò thẳng, 10 MHz', 'Đầu dò cong, 3,5 MHz', 'Đầu dò mảng pha, 9 MHz', 'Đầu dò phẳng, 12 MHz'],
      a: 1,
      why: 'Khảo sát ở độ sâu lớn qua thành bụng cần tần số thấp (2–5 MHz) để giảm suy hao; đầu dò cong tạo trường quét hình quạt rộng.'
    },
    {
      q: 'Khi tăng tần số sóng siêu âm từ 3 MHz lên 10 MHz thì',
      o: ['Độ phân giải tăng và độ xuyên sâu tăng', 'Độ phân giải tăng nhưng độ xuyên sâu giảm', 'Độ phân giải giảm và độ xuyên sâu tăng', 'Bước sóng tăng lên'],
      a: 1,
      why: 'Tăng tần số làm bước sóng λ giảm (độ phân giải tăng), nhưng hệ số hấp thụ α tăng mạnh nên sóng suy giảm nhanh theo độ sâu.'
    },
    {
      q: 'Kết quả của siêu âm kiểu A (A-scan) được biểu diễn dưới dạng',
      o: ['Ảnh hai chiều của mặt cắt cơ thể', 'Đồ thị biên độ tín hiệu theo thời gian trên một phương', 'Ảnh khối ba chiều', 'Phổ màu dòng máu'],
      a: 1,
      why: 'Kiểu A hiển thị các đỉnh biên độ điện áp theo thời gian truyền, dùng để đo chính xác khoảng cách hoặc bề dày lớp mô.'
    },
    {
      q: 'Nguyên tắc dựng ảnh 2D của siêu âm kiểu B (B-scan) là',
      o: ['Dùng hai đầu dò phát vuông góc nhau', 'Ghép nhiều đường quét kiểu A, đổi biên độ thành độ sáng điểm ảnh', 'Không cần đo thời gian phản xạ', 'Chỉ thu sóng truyền thẳng qua cơ thể'],
      a: 1,
      why: 'Đầu dò quét ngang qua lát cắt; xung phản xạ có biên độ càng lớn thì điểm ảnh tương ứng trên màn hình càng sáng.'
    },
    {
      q: 'Chế độ hiển thị nào thường dùng để theo dõi sự đóng – mở của van tim theo thời gian?',
      o: ['Kiểu A', 'Kiểu B tĩnh', 'Kiểu M (Time–motion)', 'Chụp X-quang'],
      a: 2,
      why: 'Kiểu M (TM) ghi lại sự thay đổi vị trí của các mặt phản xạ theo trục thời gian, phù hợp để khảo sát hoạt động của van tim.'
    },
    {
      q: 'Siêu âm Doppler ứng dụng độ dịch tần số để xác định',
      o: ['Nhiệt độ mô mềm', 'Vận tốc và hướng chuyển động của dòng máu', 'Khối lượng riêng của xương', 'Thời gian bán rã'],
      a: 1,
      why: 'Sóng phản xạ từ các tế bào hồng cầu chuyển động bị dịch tần số Δf tỉ lệ thuận với thành phần vận tốc dọc theo phương chùm tia.'
    },
    {
      q: 'Trên ảnh siêu âm, da và xương hiện lên sáng rõ hơn các mô mềm xung quanh vì',
      o: ['Da và xương tự phát sáng', 'Chênh lệch trở kháng âm tại mặt phân cách lớn nên phản xạ mạnh', 'Mô mềm không phản xạ sóng', 'Tần số sóng ở xương tăng gấp đôi'],
      a: 1,
      why: 'Chênh lệch trở kháng âm Z lớn làm hệ số phản xạ năng lượng cao, tạo tín hiệu điện áp thu về có biên độ lớn.'
    },
    {
      q: 'Vì sao siêu âm ít được sử dụng để chẩn đoán bệnh lí bên trong não người lớn?',
      o: ['Não có tốc độ truyền âm bằng 0', 'Xương hộp sọ phản xạ và hấp thụ siêu âm rất mạnh', 'Siêu âm gây ion hoá tế bào thần kinh', 'Não không chứa nước'],
      a: 1,
      why: 'Xương hộp sọ phản xạ và hấp thụ phần lớn năng lượng siêu âm ở cả chiều truyền vào và chiều phản xạ trở ra, nên thường sử dụng CT hoặc MRI.'
    },
    {
      q: 'Tàu khảo sát phát xung sonar, sau 4,0 s nhận được sóng phản xạ từ đáy biển (v = 1500 m/s). Độ sâu đáy biển là',
      o: ['1500 m', '3000 m', '4500 m', '6000 m'],
      a: 1,
      why: 'h = v · t / 2 = 1500 × 4,0 / 2 = 3000 m.'
    },
    {
      q: 'Khi kiểm tra khuyết tật trong khối thép, nếu bên trong có lỗ rỗng thì trên màn hình kiểu A sẽ thấy',
      o: ['Chỉ còn xung phát ban đầu', 'Xuất hiện thêm một xung phản xạ ở trước xung mặt đáy', 'Xung mặt đáy biến mất hoàn toàn', 'Tần số sóng giảm đi một nửa'],
      a: 1,
      why: 'Lỗ rỗng chứa không khí tạo mặt phân cách thép – không khí, phản xạ sớm một xung trước khi sóng truyền tới mặt đáy khối thép.'
    }
  ];

  const qText = $('#qText'), qOpts = $('#qOpts'), qDots = $('#qDots'),
    qIdx = $('#qIdx'), qScore = $('#qScore'), qFb = $('#qFeedback'),
    qNext = $('#qNext'), qHint = $('#qHint');
  let qi = 0, score = 0, answered = false, done = false;

  function dots() {
    qDots.innerHTML = QS.map((_, i) => `<i class="${i < qi ? 'done' : i === qi ? 'now' : ''}"></i>`).join('');
  }
  function render() {
    answered = false;
    qFb.innerHTML = '';
    qNext.disabled = true;
    qNext.textContent = 'Câu tiếp →';
    qHint.textContent = 'Chọn một đáp án';
    qIdx.textContent = `Câu ${qi + 1} / ${QS.length}`;
    qScore.textContent = `${score} / ${QS.length} điểm`;
    dots();
    const Q = QS[qi];
    qText.textContent = Q.q;
    qOpts.innerHTML = '';
    Q.o.forEach((txt, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = `<span class="l">${'ABCD'[i]}</span><span>${txt}</span>`;
      b.onclick = () => pick(i);
      qOpts.appendChild(b);
    });
  }
  function pick(i) {
    if (answered) return;
    answered = true;
    const Q = QS[qi];
    const ok = i === Q.a;
    if (ok) score++;
    [...qOpts.children].forEach((b, k) => {
      if (k === Q.a) b.classList.add('correct');
      else if (k === i) b.classList.add('wrong');
      else b.classList.add('dimmed');
    });
    qFb.innerHTML = `<div class="feedback ${ok ? '' : 'bad'}">${ok ? '✓ Chính xác. ' : '✗ Chưa đúng. '}${Q.why}</div>`;
    qScore.textContent = `${score} / ${QS.length} điểm`;
    qHint.textContent = ok ? 'Chính xác.' : 'Xem phần giải thích ở trên.';
    qNext.disabled = false;
    qNext.textContent = qi === QS.length - 1 ? 'Xem kết quả →' : 'Câu tiếp →';
  }
  function result() {
    done = true;
    qIdx.textContent = 'Hoàn thành';
    qScore.textContent = `${score} / ${QS.length} điểm`;
    qDots.innerHTML = QS.map(() => '<i class="done"></i>').join('');
    const msg = score === QS.length ? 'Hoàn thành xuất sắc toàn bộ 15 câu hỏi kiến thức về Siêu âm.'
      : score >= 11 ? 'Kết quả tốt — cần rà soát lại một số câu chưa chính xác.'
        : 'Cần ôn tập lại các nội dung trọng tâm: hiệu ứng áp điện, vai trò lớp gel và công thức d = v·Δt/2.';
    qText.textContent = `Kết quả: ${score} / ${QS.length} câu đúng`;
    qOpts.innerHTML = `<div class="feedback ${score >= 10 ? '' : 'bad'}" style="grid-column:1/-1">${msg}</div>`;
    qFb.innerHTML = '';
    qHint.textContent = 'Nhấn “Làm lại” để thực hiện lượt mới';
    qNext.disabled = false;
    qNext.textContent = '↻ Làm lại';
  }
  qNext.onclick = () => {
    if (done) { qi = 0; score = 0; done = false; render(); return; }
    if (!answered) return;
    if (qi === QS.length - 1) { result(); return; }
    qi++; render();
  };
  render();
})();
