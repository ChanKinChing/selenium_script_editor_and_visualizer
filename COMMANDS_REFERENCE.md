# Selenium TestGen — 指令參考表

## 欄位說明

| 欄位 | CSV 順序 | 說明 |
|------|----------|------|
| p1 | 第 1 欄 | 主要參數（XPath / URL / 變數） |
| p2 | 第 2 欄 | 次要參數（文字 / 選項 / 變數 / 訊息） |
| action | 第 3 欄 | 指令名稱 |
| readOnly | — | 該欄位是否唯讀（不可輸入） |

---

## 完整指令一覽

| 指令 | 分類 | p1 | p1 唯讀? | p2 | p2 唯讀? | p2 可空白? | 語義範例 |
|------|------|----|----------|----|----------|-----------|----------|
| `open` | 導航／等待 | URL | ✅ | URL |  |  | 開啟網頁 |
| `pause` | 導航／等待 | — | ✅ | 秒數 |  | ✅ | 等待 N 秒 |
| `click` | 操作 | XPath |  | — | ✅ | ✅ | 點擊元素 |
| `type` | 操作 | XPath |  | 文字 |  |  | 輸入文字 |
| `dropdown` | 操作 | XPath |  | 選項 |  | **✅** | 下拉選取 |
| `press` | 操作 | XPath |  | 按鍵 |  |  | 按鍵操作 |
| `present` | 確認存在 | XPath |  | — | ✅ | ✅ | 存在 DOM |
| `visible` | 確認存在 | XPath |  | — | ✅ | ✅ | 可見 |
| `not_present` | 確認存在 | XPath |  | — | ✅ | ✅ | 不存在 DOM |
| `not_visible` | 確認存在 | XPath |  | — | ✅ | ✅ | 不可見 |
| `assert_text` | 斷言 | XPath |  | 預期文字 |  | **✅** | 斷言文字 |
| `assert_attribute_value` | 斷言 | XPath |  | 屬性名 |  | **✅** | 斷言屬性值 |
| `assert_class` | 斷言 | XPath |  | class 名 |  |  | 斷言 class |
| `compare_eq` | 斷言 | 變數 A | ✅ | 變數 B |  |  | 比較變數 |
| `get_text` | 取值 | XPath |  | 變數名 |  |  | 取文字 |
| `get_attribute_value` | 取值 | XPath |  | 變數名 |  |  | 取屬性值 |
| `print` | 其他 | — | ✅ | 訊息 |  | **✅** | 輸出日誌 |
| `check_file_downloaded` | 其他 | — | ✅ | 檔名 |  |  | 確認下載 |
| `check_presence_to_continue` | 條件區塊 | XPath |  | `present` |  |  | 若存在 → 執行區塊 |
| `end_check_presence_to_continue` | 條件區塊 | — | ✅ | — | ✅ | ✅ | 結束條件區塊 |

> **標記說明**：`✅` = 唯讀（不可編輯）。空白 = 可編輯。
>
> **p2 可空白?**：標 `✅` 表示 p2 可留空，無紅框/紅底/驗證錯誤。

---

## CSV 格式

```
TC_NAME,p1,p2,action,p1,p2,action,...
```

每 3 欄一組：`p1, p2, action`。空值留空但保留逗號：

```
TC1,https://example.com,,open,//button,,click,//input,hello,type
TC2,//div,present,check_presence_to_continue,,,end_check_presence_to_continue
```

---

## 驗證規則

| 規則 | 適用 |
|------|------|
| XPath 須以 `//` / `/` / `(` / `./` 開頭 | click, type, dropdown, press, present, visible, not_present, not_visible, assert_text, assert_attribute_value, assert_class, get_text, get_attribute_value, check_presence_to_continue |
| URL 須以 `http://` / `https://` / `/` 開頭 | open |
| 秒數須為純數字 | pause |

---

## 條件區塊配對

- `check_presence_to_continue` 與 `end_check_presence_to_continue` 須成對
- 未配對時語義欄顯示 ⚠ 警示
- 可巢狀嵌套（內部自動計算區塊深度）

---

## 自動同步（File System Access API）

> 需要 **Chrome / Edge**，且以 **https（如 GitHub Pages）或 localhost** 開啟。Firefox / Safari 或 `file://` 開啟時自動降級為舊行為（僅手動同步）。

### 開啟方式

1. 點「**載入CSV**」→ 使用瀏覽器檔案選擇器選取 CSV（會詢問「檢視及編輯」權限，請允許）
2. 或開啟工具後若上次的檔案仍在（瀏覽器有記住權限），會**自動載入並連線**

### 連線後的行為

| 功能 | 說明 |
|------|------|
| 自動更新 | 每 2.5 秒檢查 CSV 是否被外部程式（Excel 等）修改，修改即自動重新載入 |
| 衝突處理 | 若你正在編輯（有未儲存更改）且外部同時修改 → 彈窗詢問「保留目前編輯」或「重新載入」 |
| 自動同步 | 停止輸入 2 秒後自動寫回 CSV（有錯誤時不會寫入） |
| 手動同步 | 「同步更變到CSV」按鈕直接覆寫原始檔案（不再另存） |
| 狀態徽章 | 標題列右側：🟢 自動同步（已連線）/ ⚪ 唯讀模式 |

### 注意事項

- 斷點（紅色步驟編號）僅為編輯器 UI 狀態，不會寫入 CSV
- 清空所有 Test Case 會解除檔案連線（下次需重新授權）
- 權限被瀏覽器降級時，功能自動回到「唯讀模式」（可編輯但需手動導出）
