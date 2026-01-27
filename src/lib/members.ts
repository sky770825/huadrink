// 內部成員名單
// 從 CSV 文件導入的成員資料

export interface Member {
  id: number;
  name: string;
  specialty: string;
  phone?: string; // 電話將從 Google Sheets 自動填選
}

// 從 CSV 解析的成員資料
export const MEMBERS: Member[] = [
  { id: 1, name: '洪怡芳Ruby', specialty: '包租代管平台' },
  { id: 2, name: '何青馨Eva', specialty: '人壽房產金融' },
  { id: 3, name: '黃懷瑩Hannah', specialty: '桃園市軟裝設計' },
  { id: 4, name: '黃齡毅Melody', specialty: '雙北軟裝設計' },
  { id: 5, name: '鄭博元', specialty: '一條龍搬家' },
  { id: 6, name: '戴龍睿Brett', specialty: '包租代管-內湖區' },
  { id: 7, name: '林於樵Joe', specialty: '臉書發文機器人' },
  { id: 8, name: '邱碩鈺Ellie', specialty: '雙北住宅買房教學' },
  { id: 9, name: '陳書緯Peter', specialty: '專業投資人-高資產' },
  { id: 10, name: '張榮均', specialty: '商務中心-新莊' },
  { id: 11, name: '姚巧玲Amanda', specialty: '包租代管-士林' },
  { id: 12, name: '蘇家弘Andre', specialty: '包租代管-北投' },
  { id: 13, name: '莊雅嵐Scarlett', specialty: '包租代管-高雄左營、鼓山、楠梓、三民' },
  { id: 14, name: '王鈞和Ray', specialty: '包租代管-大同區' },
  { id: 15, name: '胡宇駿Josh', specialty: '手工沙發-赫里亞' },
  { id: 16, name: '蔡濬瑒', specialty: '房屋買賣-楊梅、中壢、平鎮、龍潭' },
  { id: 17, name: '方建勛/小巨', specialty: '小巨除蟲專家-雙北' },
  { id: 18, name: '周庠', specialty: '代租代管-台北市' },
  { id: 19, name: '黃馨嬋Sunny', specialty: '包租代管-新北市雙和區' },
  { id: 20, name: '王俐穎', specialty: '包租代管-台北市南港區' },
  { id: 21, name: '林雨青Queenie', specialty: '包租代管-台北市大安區西區' },
  { id: 23, name: '鍾依靜', specialty: '地政士代書-桃園市平鎮、中壢、龍潭、楊梅、大溪區' },
  { id: 24, name: '林純純Carrie', specialty: '包租代管-台北市大安區南區' },
  { id: 26, name: '林律吟Rita', specialty: '窗簾窗飾業-雙北' },
  { id: 27, name: '邱梅鈴', specialty: '彩妝教學-雙北、桃園' },
  { id: 28, name: '周擇宇', specialty: '系統櫃-台灣中部地區' },
  { id: 29, name: '劉宜佳Carol', specialty: '房產投資客-高雄區' },
  { id: 30, name: '李世偉Bob', specialty: '社會住宅包租代管-桃園' },
  { id: 31, name: '李佳玲Adline', specialty: '品牌行銷-活動企劃與執行-北部' },
  { id: 32, name: '黃博俊Wally', specialty: '壽險-醫療險' },
  { id: 33, name: '黃思齊Leti', specialty: '整理師-台北市' },
  { id: 34, name: '陳塵', specialty: '溝通教練-藝術律動' },
  { id: 35, name: '陳舒婷', specialty: '地板建材-台灣中部地區' },
  { id: 36, name: '羅珮玉Ruby', specialty: '土地資產傳承' },
  { id: 37, name: '廖士鈞', specialty: '資產活化-觀光旅宿業宜蘭區' },
  { id: 38, name: '陳乙嘉', specialty: '房屋產險-北部' },
  { id: 39, name: '黃鈺琦Rowan', specialty: '危老都更業-雙北' },
  { id: 40, name: '白岳霖Kelly', specialty: '住宅室內設計-台中區' },
  { id: 41, name: '賴易紃Ruby', specialty: '統包工程-雙北市' },
  { id: 42, name: '黃泓顥', specialty: '理財型房貸減壓-北部' },
  { id: 43, name: '龔秋敏', specialty: '基金理財-中部' },
  { id: 44, name: '笠原藤真', specialty: '房屋仲介-商用廠房-北區' },
  { id: 45, name: '何欣哲Cliff', specialty: '包租代管-萬華區' },
  { id: 46, name: '陳貞茹Vivi', specialty: '積木式鋁櫃' },
  { id: 47, name: '陳力羣/娃娃', specialty: '住宅室內設計-新北市三重、蘆洲、板橋、中和、永和、淡水' },
  { id: 48, name: '陳逸凱/阿凱', specialty: '住宅室內設計-台北市' },
  { id: 49, name: '陳昱維Tony', specialty: '宜蘭民宿平台' },
  { id: 50, name: '林柏蒼Kevin', specialty: '包租業清潔-雙北' },
  { id: 51, name: '陳誌原', specialty: '包租代管-新北市板橋區' },
  { id: 52, name: '林昱均Judy', specialty: '月租型田野短租-宜蘭' },
  { id: 53, name: '林易增Eason', specialty: '美潔盾地板建材及施工' },
  { id: 54, name: '蔣京叡', specialty: '房產線上導客' },
  { id: 55, name: '唐靖童Amy', specialty: '辦公室租賃-台北市中山、松山、信義區' },
  { id: 56, name: '郭洲忠Joe', specialty: '模組化輕裝修-北部' },
  { id: 57, name: 'Josh Hung', specialty: '進口戶外遮陽設備' },
  { id: 58, name: '羅豪偉', specialty: '長照空間規劃-北部' },
  { id: 59, name: '黃聖文Color', specialty: '住宅室內設計-台南市' },
  { id: 60, name: '林稼諭Jessica', specialty: '包租代管-新北市三重區' },
  { id: 61, name: '張簡筱凡Sarah', specialty: '房屋仲介業-新加坡' },
  { id: 62, name: '陳姵璇Ann', specialty: '房產專業律師-北部' },
  { id: 63, name: '王勝仟Johnny', specialty: '機電工程規畫派遣-台北市' },
  { id: 64, name: '劉怡吟', specialty: '法拍屋代標-北部' },
  { id: 65, name: '吳富明Alan', specialty: '抗病毒抗菌地板-北部' },
  { id: 66, name: '陳亞靖Emily', specialty: '包租代管-台北市中山南區' },
  { id: 67, name: '丁乃玉', specialty: '澳洲房產投資講師' },
  { id: 68, name: '楊麗華', specialty: '包租代管-高雄新興、前金、鹽埕、苓雅、前鎮' },
  { id: 69, name: '陳百毅', specialty: '小坪數空間造型師-台中' },
  { id: 70, name: '沈琳朣Sophia', specialty: '法拍屋代標-中部' },
  { id: 71, name: '王瑀Eva', specialty: '企業形象官網（無購物車）-北部' },
  { id: 72, name: '黃靜愉', specialty: '包租代管 (隔套出租)-台南中西區' },
  { id: 73, name: '蔡宜靜Ronda', specialty: '包租代管-新竹市' },
  { id: 74, name: '田智娟Joanna', specialty: '房東租房管理系統' },
  { id: 75, name: '黃彥銘', specialty: '土地開發-台北市' },
  { id: 76, name: '申瑩萱Sally', specialty: '房屋仲介業-台北市大安區、中正區' },
  { id: 77, name: '沈玲婕', specialty: '科學風水命理教學' },
  { id: 78, name: '林裕翔Shawn', specialty: '冷氣安裝保養維修- 雙北' },
  { id: 79, name: '陳啟宇Andy', specialty: '買房陪跑教練- 雙北' },
  { id: 80, name: '游曉瑄Charming', specialty: 'Meta廣告投放' },
  { id: 81, name: '廖瑀瑄Fay', specialty: '歐必斯床墊' },
  { id: 82, name: '游珈嘉', specialty: '建案品牌視覺設計- 北部' },
  { id: 83, name: '杜佳曄杜杜', specialty: '藥局-桃園' },
  { id: 84, name: '張濬池', specialty: '中小企業政府補助顧問- 高雄' },
  { id: 85, name: '陳閔祥James', specialty: '法商策略顧問' },
  { id: 87, name: '謝慈軒', specialty: '綠晶木環保建材' },
  { id: 88, name: '呂宥澄', specialty: '飯店專業施工' },
  { id: 89, name: '陳家穎Queenie', specialty: '包租代管-台北市松山西區（光復北路以西）' },
  { id: 90, name: '張家華', specialty: '房屋仲介業-住宅-新北市雙和區' },
  { id: 91, name: '黃振呈', specialty: '冷氣空調設備-北部' },
  { id: 92, name: '林典毅Chance', specialty: '短影音代操' },
  { id: 93, name: '楊哲軒 Darren', specialty: '居家收納用品電商' },
  { id: 94, name: '林怡均Karen', specialty: '租賃企業管理系統 （ERP)' },
  { id: 95, name: '黃詩惠Katy', specialty: 'AI設計師接案軟體' },
  { id: 96, name: '王文子', specialty: '買房投資-高雄' },
  { id: 97, name: '顏敏哲', specialty: '建築執照顧問' },
  { id: 98, name: '林鉦澤 (阿信）', specialty: '房屋仲介業- 新北市三重、蘆洲' },
  { id: 99, name: '簡麒倫Chi Lu', specialty: '包租代管業（隔套出租）- 台中市' },
  { id: 100, name: '廖宜勤-Daniel', specialty: '影像直播服務' },
  { id: 101, name: '林雨軒', specialty: '合法隔套設計裝修' },
  { id: 102, name: '唐瑋Oma', specialty: '旅館商空室內設計師- 北部' },
  { id: 103, name: '左沁靈', specialty: '綜合建材數位轉型' },
  { id: 104, name: '謝欣蓉/小布', specialty: '毛一本唐揚茶漬- 新竹' },
  { id: 105, name: '陳俊翔AK', specialty: '紫微風水命理規劃' },
  { id: 106, name: '范藝馨', specialty: '理財型房貸-台北富邦銀行' },
  { id: 107, name: '康博勝', specialty: '冷氣細清-桃竹苗' },
  { id: 108, name: '蔡明翰Marco', specialty: '房屋仲介業- 新北市林口區' },
  { id: 109, name: '顏羽宏', specialty: '一般照明設備' },
  { id: 110, name: '孫士閔', specialty: 'AIoT物聯網平台' },
];

/**
 * 根據 ID 查找成員
 */
export function getMemberById(id: number): Member | undefined {
  return MEMBERS.find(m => m.id === id);
}

/**
 * 根據名稱查找成員
 */
export function getMemberByName(name: string): Member | undefined {
  return MEMBERS.find(m => m.name === name);
}
