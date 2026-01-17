// Static employee data for fallback when Supabase is not configured
// This data mirrors the Supabase employees table

export interface StaticEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  level: string;
  branchId: string | null;
  salary: number;
  phone?: string;
  email?: string;
  hireDate?: string;
  type?: string; // Full-time, Part-time
}

export const employees: StaticEmployee[] = [
  // C-SPACE YUNUSABAD BRANCH
  { id: '1', employeeId: 'EMP001', fullName: 'Nodir Mahmudov', position: 'BM', level: 'middle', branchId: 'yunusabad', salary: 5000000, email: 'nodir.mahmudov@cspace.uz', type: 'Full-time' },
  { id: '2', employeeId: 'EMP002', fullName: 'Said Florist', position: 'Florist', level: 'senior', branchId: 'yunusabad', salary: 1800000, email: 'said.yunusabad@cspace.uz', type: 'Part-time' },
  { id: '3', employeeId: 'EMP003', fullName: 'Nigina Umaraliyeva', position: 'Legal Manager', level: 'middle', branchId: null, salary: 10000000, email: 'nigina.umaraliyeva@cspace.uz', type: 'Full-time' },
  { id: '4', employeeId: 'EMP004', fullName: 'Yusufjon Sayfullayev', position: 'NS', level: 'junior', branchId: 'labzak', salary: 3500000, email: 'yusufjon.sayfullayev@cspace.uz', type: 'Full-time' },
  { id: '5', employeeId: 'EMP005', fullName: 'Ruxshona Nabijonova', position: 'QA', level: 'junior', branchId: null, salary: 3000000, email: 'ruxshona.nabijonova@cspace.uz', type: 'Part-time' },
  { id: '6', employeeId: 'EMP006', fullName: 'Shahzod Xabibjonov', position: 'NS', level: 'junior', branchId: 'yunusabad', salary: 3500000, email: 'shahzod.xabibjonov@cspace.uz', type: 'Full-time' },
  { id: '7', employeeId: 'EMP007', fullName: 'Rahmatulloh Yusupov', position: 'Facility Manager', level: 'middle', branchId: 'yandex', salary: 7500000, email: 'rahmatulloh.yusupov@cspace.uz', type: 'Full-time' },
  { id: '8', employeeId: 'EMP008', fullName: 'Jamshid Farhodov', position: 'NS', level: 'junior', branchId: 'chust', salary: 3000000, email: 'jamshid.farhodov@cspace.uz', type: 'Full-time' },
  { id: '9', employeeId: 'EMP009', fullName: 'Xushbaxt Abdusalomov', position: 'NS', level: 'junior', branchId: 'yunusabad', salary: 3500000, email: 'xushbaxt.abdusalomov@cspace.uz', type: 'Full-time' },
  { id: '10', employeeId: 'EMP010', fullName: 'Paxlavon Mahmud Begijonov', position: 'NS', level: 'middle', branchId: 'yunusabad', salary: 6000000, email: 'paxlavon.begijonov@cspace.uz', type: 'Full-time' },
  { id: '11', employeeId: 'EMP011', fullName: 'Axror Umarov', position: 'CM', level: 'junior', branchId: 'yunusabad', salary: 4000000, email: 'axror.umarov@cspace.uz', type: 'Full-time' },
  { id: '12', employeeId: 'EMP012', fullName: 'Sayyora Sharipova', position: 'Accounting Manager', level: 'middle', branchId: null, salary: 5000000, email: 'sayyora.sharipova@cspace.uz', type: 'Full-time' },
  { id: '13', employeeId: 'EMP013', fullName: 'Maxmudjon Bustonov', position: 'Operations Specialist', level: 'middle', branchId: null, salary: 10000000, email: 'maxmudjon.bustonov@cspace.uz', type: 'Full-time' },
  { id: '14', employeeId: 'EMP014', fullName: 'Mirvohid Raimbekov', position: 'Sales Manager', level: 'middle', branchId: null, salary: 8000000, email: 'mirvohid.raimbekov@cspace.uz', type: 'Full-time' },

  // C-SPACE LABZAK BRANCH
  { id: '15', employeeId: 'EMP015', fullName: 'Sulhiya Aminova', position: 'QA', level: 'middle', branchId: null, salary: 6000000, email: 'sulhiya.aminova@cspace.uz', type: 'Full-time' },
  { id: '16', employeeId: 'EMP016', fullName: 'Abror Umarov', position: 'BM', level: 'middle', branchId: 'labzak', salary: 6000000, email: 'abror.umarov@cspace.uz', type: 'Full-time' },
  { id: '17', employeeId: 'EMP017', fullName: 'Said Florist Labzak', position: 'Florist', level: 'senior', branchId: 'labzak', salary: 1500000, email: 'said.labzak@cspace.uz', type: 'Part-time' },
  { id: '18', employeeId: 'EMP018', fullName: 'Zuxriddin Abduraxmonov', position: 'GM', level: 'executive', branchId: null, salary: 3000000, email: 'zuxriddin.abduraxmonov@cspace.uz', type: 'Full-time' },
  { id: '19', employeeId: 'EMP019', fullName: 'Xusravbek Olimjonov', position: 'NS', level: 'junior', branchId: 'labzak', salary: 3000000, email: 'xusravbek.olimjonov@cspace.uz', type: 'Full-time' },
  { id: '20', employeeId: 'EMP020', fullName: 'Solih', position: 'CM', level: 'junior', branchId: 'labzak', salary: 3000000, email: 'solih@cspace.uz', type: 'Full-time' },
  { id: '21', employeeId: 'EMP021', fullName: 'Bekzod Tursunaliyev', position: 'NS', level: 'junior', branchId: 'labzak', salary: 3000000, email: 'bekzod.tursunaliyev@cspace.uz', type: 'Full-time' },
  { id: '22', employeeId: 'EMP022', fullName: 'Fozilbek Akmalov', position: 'CM', level: 'junior', branchId: 'beruniy', salary: 3000000, email: 'fozilbek.akmalov@cspace.uz', type: 'Part-time' },
  { id: '23', employeeId: 'EMP023', fullName: 'Lobarxon Abdurasulova', position: 'AXO', level: 'junior', branchId: 'labzak', salary: 4000000, email: 'lobarxon.abdurasulova@cspace.uz', type: 'Full-time' },
  { id: '24', employeeId: 'EMP024', fullName: 'Guljamal Kenjabayeva', position: 'AXO', level: 'junior', branchId: 'labzak', salary: 4500000, email: 'guljamal.kenjabayeva@cspace.uz', type: 'Full-time' },

  // C-SPACE ELBEK BRANCH
  { id: '25', employeeId: 'EMP025', fullName: 'Nodirbek Yusupov', position: 'Maintenance', level: 'middle', branchId: null, salary: 5000000, email: 'nodirbek.yusupov@cspace.uz', type: 'Full-time' },
  { id: '26', employeeId: 'EMP026', fullName: 'Ibrohim Abduqodirov', position: 'BM', level: 'middle', branchId: 'elbek', salary: 5000000, email: 'ibrohim.abduqodirov@cspace.uz', type: 'Full-time' },
  { id: '27', employeeId: 'EMP027', fullName: 'Munira Bababekova', position: 'AXO', level: 'senior', branchId: 'elbek', salary: 6000000, email: 'munira.bababekova@cspace.uz', type: 'Full-time' },
  { id: '28', employeeId: 'EMP028', fullName: 'Gulbahor Primova', position: 'AXO', level: 'middle', branchId: 'elbek', salary: 4000000, email: 'gulbahor.primova@cspace.uz', type: 'Full-time' },
  { id: '29', employeeId: 'EMP029', fullName: 'Saodat Ikromova', position: 'AXO', level: 'middle', branchId: 'elbek', salary: 3000000, email: 'saodat.ikromova@cspace.uz', type: 'Part-time' },
  { id: '30', employeeId: 'EMP030', fullName: 'Said Florist Elbek', position: 'Florist', level: 'senior', branchId: 'elbek', salary: 1400000, email: 'said.elbek@cspace.uz', type: 'Part-time' },
  { id: '31', employeeId: 'EMP031', fullName: 'Ibrohim Oripov', position: 'CM', level: 'junior', branchId: 'elbek', salary: 4000000, email: 'ibrohim.oripov@cspace.uz', type: 'Part-time' },
  { id: '32', employeeId: 'EMP032', fullName: 'Fozilxon Raxmatov', position: 'CM', level: 'junior', branchId: null, salary: 3000000, email: 'fozilxon.raxmatov@cspace.uz', type: 'Part-time' },
  { id: '33', employeeId: 'EMP033', fullName: 'Salim Avazov', position: 'NS', level: 'junior', branchId: 'aero', salary: 4000000, email: 'salim.avazov@cspace.uz', type: 'Full-time' },
  { id: '34', employeeId: 'EMP034', fullName: 'Axror Nazirqulov', position: 'NS', level: 'junior', branchId: 'elbek', salary: 3000000, email: 'axror.nazirqulov@cspace.uz', type: 'Full-time' },
  { id: '35', employeeId: 'EMP035', fullName: 'Bexruz Xaydarov', position: 'NS', level: 'junior', branchId: 'elbek', salary: 3000000, email: 'bexruz.xaydarov@cspace.uz', type: 'Full-time' },
  { id: '36', employeeId: 'EMP036', fullName: 'Mirjalol Omonqulov', position: 'CM', level: 'junior', branchId: 'elbek', salary: 3500000, email: 'mirjalol.omonqulov@cspace.uz', type: 'Full-time' },

  // C-SPACE CHUST BRANCH
  { id: '37', employeeId: 'EMP037', fullName: 'Durbek Shaymardanov', position: 'Construction Manager', level: 'middle', branchId: null, salary: 15000000, email: 'durbek.shaymardanov@cspace.uz', type: 'Full-time' },
  { id: '38', employeeId: 'EMP038', fullName: 'Samad Gaipov', position: 'Sales Intern', level: 'junior', branchId: null, salary: 4500000, email: 'samad.gaipov@cspace.uz', type: 'Part-time' },
  { id: '39', employeeId: 'EMP039', fullName: 'Said Florist Chust', position: 'Florist', level: 'senior', branchId: 'chust', salary: 1400000, email: 'said.chust@cspace.uz', type: 'Part-time' },
  { id: '40', employeeId: 'EMP040', fullName: 'Gavhar Abdigayeva', position: 'AXO', level: 'middle', branchId: 'yandex', salary: 4500000, email: 'gavhar.abdigayeva@cspace.uz', type: 'Full-time' },
  { id: '41', employeeId: 'EMP041', fullName: 'Saodat Rahimova', position: 'AXO', level: 'middle', branchId: 'yandex', salary: 4500000, email: 'saodat.rahimova@cspace.uz', type: 'Full-time' },
  { id: '42', employeeId: 'EMP042', fullName: 'Xurshida Muxamedjanova', position: 'AXO', level: 'middle', branchId: 'yandex', salary: 3000000, email: 'xurshida.muxamedjanova@cspace.uz', type: 'Full-time' },
  { id: '43', employeeId: 'EMP043', fullName: 'Nabijon Turgunov', position: 'CEO Assistant', level: 'middle', branchId: 'chust', salary: 10000000, email: 'nabijon.turgunov@cspace.uz', type: 'Full-time' },
  { id: '44', employeeId: 'EMP044', fullName: 'Javlon Toshpulatov', position: 'BM', level: 'middle', branchId: 'chust', salary: 5000000, email: 'javlon.toshpulatov@cspace.uz', type: 'Full-time' },
  { id: '45', employeeId: 'EMP045', fullName: 'Mohigul Yuldoshova', position: 'AXO', level: 'middle', branchId: 'chust', salary: 3500000, email: 'mohigul.yuldoshova@cspace.uz', type: 'Full-time' },
  { id: '46', employeeId: 'EMP046', fullName: 'Jamshid Ibragimov', position: 'NS', level: 'junior', branchId: 'chust', salary: 3000000, email: 'jamshid.ibragimov@cspace.uz', type: 'Full-time' },
  { id: '47', employeeId: 'EMP047', fullName: 'Suxrob Usmonov', position: 'NS', level: 'junior', branchId: 'chust', salary: 3000000, email: 'suxrob.usmonov@cspace.uz', type: 'Full-time' },
  { id: '48', employeeId: 'EMP048', fullName: 'Ulbosin Usarova', position: 'AXO', level: 'middle', branchId: 'chust', salary: 3500000, email: 'ulbosin.usarova@cspace.uz', type: 'Full-time' },
  { id: '49', employeeId: 'EMP049', fullName: 'Ubaydullo Pulat', position: 'Business Developer', level: 'executive', branchId: null, salary: 19500000, email: 'ubaydullo.pulat@cspace.uz', type: 'Full-time' },

  // CS AERO BRANCH
  { id: '50', employeeId: 'EMP050', fullName: 'Said Florist Aero', position: 'Florist', level: 'senior', branchId: 'aero', salary: 1000000, email: 'said.aero@cspace.uz', type: 'Part-time' },
  { id: '51', employeeId: 'EMP051', fullName: 'Abubakr Sodiqov', position: 'NS', level: 'junior', branchId: 'aero', salary: 3000000, email: 'abubakr.sodiqov@cspace.uz', type: 'Full-time' },
  { id: '52', employeeId: 'EMP052', fullName: 'Oyxol Egamberdiyeva', position: 'AXO', level: 'middle', branchId: 'aero', salary: 4000000, email: 'oyxol.egamberdiyeva@cspace.uz', type: 'Full-time' },
  { id: '53', employeeId: 'EMP053', fullName: 'Humoyun Odilov', position: 'CM', level: 'junior', branchId: 'aero', salary: 4000000, email: 'humoyun.odilov@cspace.uz', type: 'Full-time' },

  // C-SPACE ORIENT (BERUNIY) BRANCH
  { id: '54', employeeId: 'EMP054', fullName: 'Nargiza Rahimova', position: 'AXO', level: 'middle', branchId: 'beruniy', salary: 4500000, email: 'nargiza.rahimova@cspace.uz', type: 'Full-time' },
  { id: '55', employeeId: 'EMP055', fullName: 'Said Florist Beruniy', position: 'Florist', level: 'senior', branchId: 'beruniy', salary: 1000000, email: 'said.beruniy@cspace.uz', type: 'Part-time' },

  // C-SPACE MUQIMIY BRANCH
  { id: '56', employeeId: 'EMP056', fullName: 'Humora Urokboyeva', position: 'AXO', level: 'junior', branchId: 'muqimiy', salary: 3000000, email: 'humora.urokboyeva@cspace.uz', type: 'Part-time' },
  { id: '57', employeeId: 'EMP057', fullName: 'Said Florist Muqimiy', position: 'Florist', level: 'senior', branchId: 'muqimiy', salary: 700000, email: 'said.muqimiy@cspace.uz', type: 'Part-time' },
  { id: '58', employeeId: 'EMP058', fullName: 'Azizbek Samiyev', position: 'CM', level: 'junior', branchId: 'muqimiy', salary: 4000000, email: 'azizbek.samiyev@cspace.uz', type: 'Full-time' },
];
// Last updated: Sat Jan 17 19:00:18 UTC 2026
