# TMR 舞臺時鐘控制台 | Stage Timer Studio

一個專為大型研討會、演講、競賽、活動舞臺與線上直播（OBS）設計的高質感網頁時鐘與計時器系統。採用純前端架構（HTML5 / CSS3 / Vanilla JS），可無縫一鍵部署於 **GitHub Pages** 或 **Vercel**。

---

## 🌟 核心特色

### 1. 雙視窗簡報與投影模式 (Dual-Window Sync)
- **後台控制台 (`index.html`)**：提供即時 16:9 預覽畫面、圖層切換主控條、計時器細部參數調整、響鈴警示規則管理與音效設定。
- **展示視窗 (`display.html`)**：點擊「另開展示視窗（簡報模式）」按鈕即可開啟。專為外接投影機、電視螢幕或 OBS 瀏覽器來源設計，**畫面極致純粹，僅呈現時鐘本體與狀態圖示**，無任何瀏覽器多餘介面。
- **即時無延遲連線**：後台與展示視窗透過瀏覽器原生 `BroadcastChannel` 及 `localStorage` 雙向同步，支援多螢幕同步顯示與狀態記憶。

### 2. 四大功能圖層與平滑轉場 (Layers & Transitions)
目前時間、正計時、倒數計時宛如不同投影圖層，在後台可隨時自由切換，或一鍵切換純黑畫面：
- **(a) 目前時間（預設值）**：精準顯示當前系統時間，支援 24/12 小時制切換、秒數切換與日期星期顯示。
- **(b) 正計時**：從 0 開始往上累加計時，提供開始、暫停、重設功能。
- **(c) 倒數計時**：自訂或快捷選擇倒數時間（如 30 秒、5 分鐘等）。**倒數歸零（00:00）後立即轉為鮮紅警示色，並自動切換為正計時持續累加超時時間**。
- **(d) 黑畫面 (Blackout)**：舞臺螢幕瞬間全黑（待命時使用），後台計時器仍維持精準運行，切換回來時立即無縫銜接。
- **淡入淡出動畫開關**：後台提供轉場動畫開關與轉場速度選擇（0.2s / 0.4s / 0.8s），提供優雅專業的視覺效果。

### 3. 字型規格：Roboto Flex 等寬屬性
- 採用 Google **Roboto Flex** 可變字型。
- 完整啟用 OpenType **等寬數字（Tabular Figures）** 屬性：
  ```css
  font-family: 'Roboto Flex', sans-serif;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  ```
  無論秒數如何快速跳動，數字寬度始終固定對齊，絕無晃動或抖動問題。

### 4. 狀態圖示規格：Material Symbols Rounded
圖示使用 Google **Material Symbols Rounded**（Not Fill，粗細 450），出現在時鐘旁（位置可選左側或右側）：
1. **目前時間**：切換至目前時間模式時，短暫顯示白色 `watch`（約 2.5 秒後淡出），其餘時間保持簡潔不顯示圖示。
2. **正計時**：
   - 開始或解除暫停時短暫顯示綠色 `timer_arrow_up`
   - 暫停時常駐顯示橘色 `pause`
3. **倒數計時**：
   - 開始或解除暫停時短暫顯示淺藍色 `timer_arrow_down`
   - 暫停時常駐顯示橘色 `pause`
   - 觸發預備鈴或結束鈴警示時，顯示黃色微動震鈴 `notifications_active`

### 5. 內建 Web Audio API 擬真會議水晶鈴
- 100% 使用 Web Audio API 即時合成水晶會議鈴（Chime）、木琴和弦（Marimba）與電子警報（Beep）。
- **零外部音效檔案依賴**，完全離線可用，絕無 404 或載入延遲問題。
- 支援自訂響鈴時機（剩餘 X 分鐘、歸零 00:00、超時 X 分鐘）與響鈴次數（1 ~ 5 聲）。

---

## ⌨️ 鍵盤快捷鍵 (Keyboard Shortcuts)

在後台控制台可使用鍵盤極速操控：

| 按鍵 | 功能 |
| :--- | :--- |
| <kbd>1</kbd> | 切換舞臺圖層為 **目前時間** |
| <kbd>2</kbd> | 切換舞臺圖層為 **正計時** |
| <kbd>3</kbd> | 切換舞臺圖層為 **倒數計時** |
| <kbd>B</kbd> | 切換 / 解除 **黑畫面 (Blackout)** |
| <kbd>Space</kbd> | **開始 / 暫停** 目前進行中的計時器 |
| <kbd>R</kbd> | **重設** 目前計時器 |
| <kbd>M</kbd> | 鈴聲 **靜音 / 取消靜音** |
| <kbd>F</kbd> | 展示視窗切換 **全螢幕模式** |

---

## 🚀 部署指南

本專案為標準純靜態網站，無需 Node.js 編譯或任何建置指令。

### 方式 A：部署到 GitHub Pages
1. 將本專案程式碼推送到您的 GitHub 倉庫（例如 `username/tmr`）。
2. 進入倉庫頁面，點選上方 **Settings** ➔ 側邊欄 **Pages**。
3. 在 **Build and deployment** 區塊：
   - **Source**：選擇 `Deploy from a branch`
   - **Branch**：選擇 `main` 分支，資料夾選擇 `/ (root)`
4. 點擊 **Save**，約 1 ~ 2 分鐘後即可在 `https://<your-username>.github.io/tmr/` 訪問網站！

### 方式 B：部署到 Vercel
1. 登入 [Vercel](https://vercel.com/)。
2. 點擊 **Add New Project**，並匯入此 GitHub 倉庫。
3. Framework Preset 保留為 **Other**，Build Command 與 Output Directory 保留空白。
4. 點擊 **Deploy**，數秒內即可獲取生產環境網址（如 `https://tmr.vercel.app`）。

---

## 💻 本地預覽測試

若要在本機直接開啟測試：
1. **直接開啟**：直接雙擊 `index.html` 即可使用。
2. **或使用簡易本機伺服器**：
   ```bash
   # Python 3
   python -m http.server 8080
   
   # 或 Node npx serve
   npx serve .
   ```
   開啟瀏覽器訪問 `http://localhost:8080`。

---

## 📁 檔案結構

```
tmr/
├── .nojekyll             # 避免 GitHub Pages 忽略特定路徑
├── vercel.json           # Vercel 靜態快取設定
├── index.html            # 後台主控制介面 (含即時預覽與各項設定)
├── display.html          # 簡報與外接螢幕展示時鐘畫面
├── css/
│   ├── admin.css         # 後台現代暗色系 UI 樣式
│   └── display.css       # 舞臺大時鐘高對比展示樣式
├── js/
│   ├── audio.js          # Web Audio API 鈴聲即時合成器
│   ├── state.js          # 核心計時引擎、圖層狀態與廣播同步機制
│   ├── admin.js          # 後台介面互動與事件監聽
│   └── display.js        # 展示視窗渲染與圖示動畫
└── README.md             # 專案完整說明文檔
```
