// Whole names are paired deliberately: never combine tokens from different scripts.
const customers = [
  ['عبدالله العتيبي', 'abdullah.alotaibi'],
  ['محمد القحطاني', 'mohammed.alqahtani'],
  ['خالد الدوسري', 'khalid.aldosari'],
  ['أحمد الحربي', 'ahmed.alharbi'],
  ['سلمان الشمري', 'salman.alshammari'],
  ['عبدالرحمن الزهراني', 'abdulrahman.alzahrani'],
  ['يوسف الغامدي', 'yousef.alghamdi'],
  ['فهد المطيري', 'fahad.almutairi'],
  ['إبراهيم السبيعي', 'ibrahim.alsubaie'],
  ['عمر حسن', 'omar.hassan'],
  ['نورة القحطاني', 'noura.alqahtani'],
  ['سارة العتيبي', 'sara.alotaibi'],
  ['ريم الدوسري', 'reem.aldosari'],
  ['مريم الحربي', 'mariam.alharbi'],
  ['لينا الغامدي', 'lina.alghamdi'],
  ['هند الزهراني', 'hind.alzahrani'],
  ['Omar Hassan', 'omar.hassan'],
  ['Ahmed Ibrahim', 'ahmed.ibrahim'],
  ['Youssef Ali', 'youssef.ali'],
  ['Khalid Salem', 'khalid.salem'],
  ['Sara Hassan', 'sara.hassan'],
  ['Nour Ibrahim', 'nour.ibrahim'],
  ['Mariam Ali', 'mariam.ali'],
  ['Fahad Alotaibi', 'fahad.alotaibi'],
] as const;

export function demoCustomer(index: number) {
  const [customerName, emailPrefix] = customers[index % customers.length];
  return { customerName, customerEmail: `${emailPrefix}.${index}@example.com` };
}
