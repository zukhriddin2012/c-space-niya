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
}

export const employees: StaticEmployee[] = [
  // C-SPACE YUNUSABAD BRANCH
  { id: '1', employeeId: 'EMP001', fullName: 'Nodir Mahmudov', position: 'BM', level: 'Middle', branchId: 'yunusabad', salary: 5000000 },
  { id: '2', employeeId: 'EMP002', fullName: 'Said', position: 'Florist', level: 'Senior', branchId: 'yunusabad', salary: 1800000 },
  { id: '3', employeeId: 'EMP003', fullName: 'Nigina Umaraliyeva', position: 'Legal manager', level: 'Middle', branchId: null, salary: 11000000 },
  { id: '4', employeeId: 'EMP004', fullName: 'Yusufjon Sayfullayev', position: 'NS', level: 'Junior', branchId: 'labzak', salary: 3500000 },
  { id: '5', employeeId: 'EMP005', fullName: 'Ruxshona Nabijonova', position: 'QA', level: 'Junior', branchId: null, salary: 3000000 },
  { id: '6', employeeId: 'EMP006', fullName: 'Shahzod Xabibjonov', position: 'NS', level: 'Junior', branchId: 'yunusabad', salary: 3500000 },
  { id: '7', employeeId: 'EMP007', fullName: 'Rahmatulloh Yusupov', position: 'Facility manager', level: 'Junior', branchId: 'yunusabad', salary: 7500000 },
  { id: '8', employeeId: 'EMP008', fullName: 'Jamshid Farhodov', position: 'NS', level: 'Junior', branchId: 'chust', salary: 3000000 },
  { id: '9', employeeId: 'EMP009', fullName: 'Xushbaxt Abdusalomov', position: 'NS', level: 'Junior', branchId: 'yunusabad', salary: 3500000 },
  { id: '10', employeeId: 'EMP010', fullName: 'Paxlavon Mahmud Begijonov', position: 'NS', level: 'Middle', branchId: 'yunusabad', salary: 6000000 },
  { id: '11', employeeId: 'EMP011', fullName: 'Axror Umarov', position: 'CM', level: 'Junior', branchId: 'yunusabad', salary: 4000000 },
  { id: '12', employeeId: 'EMP012', fullName: 'Sayyora Sharipova', position: 'Accounting Manager', level: 'Junior', branchId: null, salary: 5000000 },

  // CS LABZAK BRANCH
  { id: '13', employeeId: 'EMP013', fullName: 'Sulhiya Aminova', position: 'QA', level: 'Middle', branchId: null, salary: 6000000 },
  { id: '14', employeeId: 'EMP014', fullName: 'Abror Umarov', position: 'BM', level: 'Middle', branchId: 'labzak', salary: 6000000 },
  { id: '15', employeeId: 'EMP015', fullName: 'Said', position: 'Florist', level: 'Senior', branchId: 'labzak', salary: 1500000 },
  { id: '16', employeeId: 'EMP016', fullName: 'Zuxriddin Abduraxmonov', position: 'GM', level: 'Executive', branchId: null, salary: 3000000 },
  { id: '17', employeeId: 'EMP017', fullName: 'Xusravbek Olimjonov', position: 'NS', level: 'Junior', branchId: 'labzak', salary: 3000000 },
  { id: '18', employeeId: 'EMP018', fullName: 'Solih', position: 'CM', level: 'Junior', branchId: 'labzak', salary: 3000000 },
  { id: '19', employeeId: 'EMP019', fullName: 'Bekzod Tursunaliyev', position: 'NS', level: 'Junior', branchId: 'labzak', salary: 3000000 },
  { id: '20', employeeId: 'EMP020', fullName: 'Fozilbek Akmalov', position: 'CM', level: 'Junior', branchId: 'labzak', salary: 3000000 },
  { id: '21', employeeId: 'EMP021', fullName: 'Lobarxon Abdurasulova', position: 'AXO', level: 'Junior', branchId: 'labzak', salary: 4000000 },
  { id: '22', employeeId: 'EMP022', fullName: 'Gulxamol Kenjabayeva', position: 'AXO', level: 'Junior', branchId: 'labzak', salary: 4500000 },

  // OTHER EMPLOYEES
  { id: '23', employeeId: 'EMP023', fullName: 'Nodirbek Yusupov', position: 'Maintenance', level: 'Middle', branchId: null, salary: 5000000 },
  { id: '24', employeeId: 'EMP024', fullName: 'Ibrohim Abduqodirov', position: 'BM', level: 'Middle', branchId: 'elbek', salary: 5000000 },
];
