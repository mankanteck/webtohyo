/**
 * 督促状PDF生成（1部屋 1ページ）
 * html2canvas でHTMLをレンダリング → jsPDF に貼り付け
 * ※ jsPDF組み込みフォントは日本語非対応のため、html2canvas経由で日本語を正しく出力する
 */

interface NotVotedUnit {
  id: string;
  roomNo: string;
  ownerName: string;
  accessToken: string;
  votingRights: number;
}

/** 1部屋分のHTMLを生成（A4縦: 794×1123px @ 96dpi） */
function buildPageHtml(
  condoName: string,
  unit: NotVotedUnit,
  url: string,
  qrDataUrl: string,
  current: number,
  total: number
): string {
  const owner = unit.ownerName ? `${unit.ownerName} 様` : "区分所有者 様";
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <div style="
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      font-family: 'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo','Yu Gothic',sans-serif;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    ">
      <!-- ヘッダー帯 -->
      <div style="
        background: #1e3a8a;
        padding: 18px 40px 16px;
      ">
        <div style="color: #93c5fd; font-size: 13px; margin-bottom: 4px;">${condoName}</div>
        <div style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 0.05em;">
          電子投票 ご回答のお願い（再送）
        </div>
      </div>

      <!-- 本文エリア -->
      <div style="padding: 36px 40px;">

        <!-- 宛名 -->
        <div style="
          border-left: 5px solid #1e3a8a;
          padding-left: 20px;
          margin-bottom: 32px;
        ">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">下記の区分所有者様へ</div>
          <div style="font-size: 48px; font-weight: bold; color: #0f172a; line-height: 1.1;">
            ${unit.roomNo} 号室
          </div>
          <div style="font-size: 20px; color: #1e293b; margin-top: 6px;">${owner}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
            議決権数: ${unit.votingRights} 口
          </div>
        </div>

        <!-- 本文 -->
        <div style="font-size: 14px; color: #334155; line-height: 1.9; margin-bottom: 28px;">
          拝啓　時下ますますご清祥のこととお慶び申し上げます。<br>
          さて、今期総会議案の電子投票につきまして、現時点でご回答が確認できておりません。<br>
          お手数をおかけいたしますが、下記のQRコードよりご回答いただきますよう<br>
          お願い申し上げます。
        </div>

        <!-- QR + 手順ボックス -->
        <div style="
          background: #f0f7ff;
          border: 1.5px solid #bfdbfe;
          border-radius: 10px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          gap: 32px;
          margin-bottom: 20px;
        ">
          <!-- 手順 -->
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 14px;">
              【投票方法】
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 2.1;">
              ① 右のQRコードをスマートフォンで読み取ります<br>
              ② 本人確認画面で情報をご確認ください<br>
              ③ 各議案に賛成・反対・棄権を選択します<br>
              ④「投票を送信する」ボタンを押して完了です
            </div>
          </div>
          <!-- QRコード -->
          <div style="text-align: center; flex-shrink: 0;">
            <img src="${qrDataUrl}" style="width: 160px; height: 160px; display: block;" />
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">スマホで読み取り</div>
          </div>
        </div>

        <!-- URL -->
        <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
          またはブラウザで下記URLにアクセスしてください：
        </div>
        <div style="
          font-size: 11px;
          color: #1d4ed8;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          padding: 8px 12px;
          word-break: break-all;
          margin-bottom: 24px;
        ">${url}</div>

        <!-- 注意事項 -->
        <div style="
          background: #fffbeb;
          border: 1.5px solid #fcd34d;
          border-radius: 8px;
          padding: 16px 20px;
          font-size: 13px;
          color: #92400e;
          line-height: 1.8;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">【ご注意】</div>
          ・このURLはお部屋専用です。他の方と共有しないようご注意ください。<br>
          ・ご不明な点がございましたら、管理会社までお問い合わせください。
        </div>
      </div>

      <!-- フッター -->
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: 1px solid #e2e8f0;
        padding: 12px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="font-size: 11px; color: #94a3b8;">${condoName}　管理会社担当</div>
        <div style="font-size: 11px; color: #94a3b8;">発行日: ${today}</div>
        <div style="font-size: 11px; color: #94a3b8;">${current} / ${total}</div>
      </div>
    </div>
  `;
}

export async function generateReminderPdf(
  condoName: string,
  units: NotVotedUnit[],
  baseUrl: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");
  const QRCode = await import("qrcode");

  // A4: 210 x 297mm
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 作業用コンテナ（画面外に配置）
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  document.body.appendChild(container);

  try {
    for (let i = 0; i < units.length; i++) {
      if (i > 0) doc.addPage();

      const unit = units[i];
      const url = `${baseUrl}/vote/${unit.accessToken}`;

      // QRコード生成
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "H",
      });

      // HTMLをDOMに挿入
      container.innerHTML = buildPageHtml(condoName, unit, url, qrDataUrl, i + 1, units.length);
      const pageEl = container.firstElementChild as HTMLElement;

      // html2canvas でキャプチャ（scale:2 で高解像度）
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      // A4サイズ(210×297mm)にフィット
      doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
    }

    doc.save(
      `督促状_${condoName}_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "")}.pdf`
    );
  } finally {
    document.body.removeChild(container);
  }
}
