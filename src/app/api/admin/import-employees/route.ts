import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export async function POST(request: NextRequest) {
  // Check for admin secret
  const authHeader = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_IMPORT_SECRET || authHeader !== process.env.ADMIN_IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // First, upsert branches
    const branches = [
      { id: 'yunusabad', name: 'C-Space Yunusabad', address: 'Yunusabad District, Tashkent', latitude: 41.3678, longitude: 69.2956, geofence_radius: 100 },
      { id: 'labzak', name: 'C-Space Labzak', address: 'Labzak Street, Mirzo Ulugbek', latitude: 41.3456, longitude: 69.3012, geofence_radius: 100 },
      { id: 'elbek', name: 'C-Space Elbek', address: 'Elbek Street, Yakkasaray', latitude: 41.2876, longitude: 69.2654, geofence_radius: 100 },
      { id: 'chust', name: 'C-Space Chust', address: 'Chust Street, Tashkent', latitude: 41.2989, longitude: 69.2432, geofence_radius: 100 },
      { id: 'aero', name: 'C-Space Aero', address: 'Near Tashkent Airport', latitude: 41.2574, longitude: 69.2814, geofence_radius: 150 },
      { id: 'beruniy', name: 'C-Space Orient (Beruniy)', address: 'Beruniy Street, Tashkent', latitude: 41.3234, longitude: 69.2567, geofence_radius: 100 },
      { id: 'muqimiy', name: 'C-Space Muqimiy', address: 'Muqumiy Street, Yunusabad', latitude: 41.3567, longitude: 69.2845, geofence_radius: 100 },
      { id: 'yandex', name: 'C-Space Yandex', address: 'Yandex Building, Tashkent', latitude: 41.3123, longitude: 69.2796, geofence_radius: 100 },
    ];

    const { error: branchError } = await supabase.from('branches').upsert(branches, { onConflict: 'id' });
    if (branchError) {
      return NextResponse.json({ error: 'Branch import failed', details: branchError.message }, { status: 500 });
    }

    // All 58 employees
    const employees = [
      { employee_id: 'EMP001', full_name: 'Nodir Mahmudov', position: 'BM', level: 'middle', branch_id: 'yunusabad', salary: 5000000, email: 'nodir.mahmudov@cspace.uz', status: 'active' },
      { employee_id: 'EMP002', full_name: 'Said Florist', position: 'Florist', level: 'senior', branch_id: 'yunusabad', salary: 1800000, email: 'said.yunusabad@cspace.uz', status: 'active' },
      { employee_id: 'EMP003', full_name: 'Nigina Umaraliyeva', position: 'Legal Manager', level: 'middle', branch_id: null, salary: 10000000, email: 'nigina.umaraliyeva@cspace.uz', status: 'active' },
      { employee_id: 'EMP004', full_name: 'Yusufjon Sayfullayev', position: 'NS', level: 'junior', branch_id: 'labzak', salary: 3500000, email: 'yusufjon.sayfullayev@cspace.uz', status: 'active' },
      { employee_id: 'EMP005', full_name: 'Ruxshona Nabijonova', position: 'QA', level: 'junior', branch_id: null, salary: 3000000, email: 'ruxshona.nabijonova@cspace.uz', status: 'active' },
      { employee_id: 'EMP006', full_name: 'Shahzod Xabibjonov', position: 'NS', level: 'junior', branch_id: 'yunusabad', salary: 3500000, email: 'shahzod.xabibjonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP007', full_name: 'Rahmatulloh Yusupov', position: 'Facility Manager', level: 'middle', branch_id: 'yandex', salary: 7500000, email: 'rahmatulloh.yusupov@cspace.uz', status: 'active' },
      { employee_id: 'EMP008', full_name: 'Jamshid Farhodov', position: 'NS', level: 'junior', branch_id: 'chust', salary: 3000000, email: 'jamshid.farhodov@cspace.uz', status: 'active' },
      { employee_id: 'EMP009', full_name: 'Xushbaxt Abdusalomov', position: 'NS', level: 'junior', branch_id: 'yunusabad', salary: 3500000, email: 'xushbaxt.abdusalomov@cspace.uz', status: 'active' },
      { employee_id: 'EMP010', full_name: 'Paxlavon Mahmud Begijonov', position: 'NS', level: 'middle', branch_id: 'yunusabad', salary: 6000000, email: 'paxlavon.begijonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP011', full_name: 'Axror Umarov', position: 'CM', level: 'junior', branch_id: 'yunusabad', salary: 4000000, email: 'axror.umarov@cspace.uz', status: 'active' },
      { employee_id: 'EMP012', full_name: 'Sayyora Sharipova', position: 'Accounting Manager', level: 'middle', branch_id: null, salary: 5000000, email: 'sayyora.sharipova@cspace.uz', status: 'active' },
      { employee_id: 'EMP013', full_name: 'Maxmudjon Bustonov', position: 'Operations Specialist', level: 'middle', branch_id: null, salary: 10000000, email: 'maxmudjon.bustonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP014', full_name: 'Mirvohid Raimbekov', position: 'Sales Manager', level: 'middle', branch_id: null, salary: 8000000, email: 'mirvohid.raimbekov@cspace.uz', status: 'active' },
      { employee_id: 'EMP015', full_name: 'Sulhiya Aminova', position: 'QA', level: 'middle', branch_id: null, salary: 6000000, email: 'sulhiya.aminova@cspace.uz', status: 'active' },
      { employee_id: 'EMP016', full_name: 'Abror Umarov', position: 'BM', level: 'middle', branch_id: 'labzak', salary: 6000000, email: 'abror.umarov@cspace.uz', status: 'active' },
      { employee_id: 'EMP017', full_name: 'Said Florist Labzak', position: 'Florist', level: 'senior', branch_id: 'labzak', salary: 1500000, email: 'said.labzak@cspace.uz', status: 'active' },
      { employee_id: 'EMP018', full_name: 'Zuxriddin Abduraxmonov', position: 'GM', level: 'executive', branch_id: null, salary: 3000000, email: 'zuxriddin.abduraxmonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP019', full_name: 'Xusravbek Olimjonov', position: 'NS', level: 'junior', branch_id: 'labzak', salary: 3000000, email: 'xusravbek.olimjonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP020', full_name: 'Solih', position: 'CM', level: 'junior', branch_id: 'labzak', salary: 3000000, email: 'solih@cspace.uz', status: 'active' },
      { employee_id: 'EMP021', full_name: 'Bekzod Tursunaliyev', position: 'NS', level: 'junior', branch_id: 'labzak', salary: 3000000, email: 'bekzod.tursunaliyev@cspace.uz', status: 'active' },
      { employee_id: 'EMP022', full_name: 'Fozilbek Akmalov', position: 'CM', level: 'junior', branch_id: 'beruniy', salary: 3000000, email: 'fozilbek.akmalov@cspace.uz', status: 'active' },
      { employee_id: 'EMP023', full_name: 'Lobarxon Abdurasulova', position: 'AXO', level: 'junior', branch_id: 'labzak', salary: 4000000, email: 'lobarxon.abdurasulova@cspace.uz', status: 'active' },
      { employee_id: 'EMP024', full_name: 'Guljamal Kenjabayeva', position: 'AXO', level: 'junior', branch_id: 'labzak', salary: 4500000, email: 'guljamal.kenjabayeva@cspace.uz', status: 'active' },
      { employee_id: 'EMP025', full_name: 'Nodirbek Yusupov', position: 'Maintenance', level: 'middle', branch_id: null, salary: 5000000, email: 'nodirbek.yusupov@cspace.uz', status: 'active' },
      { employee_id: 'EMP026', full_name: 'Ibrohim Abduqodirov', position: 'BM', level: 'middle', branch_id: 'elbek', salary: 5000000, email: 'ibrohim.abduqodirov@cspace.uz', status: 'active' },
      { employee_id: 'EMP027', full_name: 'Munira Bababekova', position: 'AXO', level: 'senior', branch_id: 'elbek', salary: 6000000, email: 'munira.bababekova@cspace.uz', status: 'active' },
      { employee_id: 'EMP028', full_name: 'Gulbahor Primova', position: 'AXO', level: 'middle', branch_id: 'elbek', salary: 4000000, email: 'gulbahor.primova@cspace.uz', status: 'active' },
      { employee_id: 'EMP029', full_name: 'Saodat Ikromova', position: 'AXO', level: 'middle', branch_id: 'elbek', salary: 3000000, email: 'saodat.ikromova@cspace.uz', status: 'active' },
      { employee_id: 'EMP030', full_name: 'Said Florist Elbek', position: 'Florist', level: 'senior', branch_id: 'elbek', salary: 1400000, email: 'said.elbek@cspace.uz', status: 'active' },
      { employee_id: 'EMP031', full_name: 'Ibrohim Oripov', position: 'CM', level: 'junior', branch_id: 'elbek', salary: 4000000, email: 'ibrohim.oripov@cspace.uz', status: 'active' },
      { employee_id: 'EMP032', full_name: 'Fozilxon Raxmatov', position: 'CM', level: 'junior', branch_id: null, salary: 3000000, email: 'fozilxon.raxmatov@cspace.uz', status: 'active' },
      { employee_id: 'EMP033', full_name: 'Salim Avazov', position: 'NS', level: 'junior', branch_id: 'aero', salary: 4000000, email: 'salim.avazov@cspace.uz', status: 'active' },
      { employee_id: 'EMP034', full_name: 'Axror Nazirqulov', position: 'NS', level: 'junior', branch_id: 'elbek', salary: 3000000, email: 'axror.nazirqulov@cspace.uz', status: 'active' },
      { employee_id: 'EMP035', full_name: 'Bexruz Xaydarov', position: 'NS', level: 'junior', branch_id: 'elbek', salary: 3000000, email: 'bexruz.xaydarov@cspace.uz', status: 'active' },
      { employee_id: 'EMP036', full_name: 'Mirjalol Omonqulov', position: 'CM', level: 'junior', branch_id: 'elbek', salary: 3500000, email: 'mirjalol.omonqulov@cspace.uz', status: 'active' },
      { employee_id: 'EMP037', full_name: 'Durbek Shaymardanov', position: 'Construction Manager', level: 'middle', branch_id: null, salary: 15000000, email: 'durbek.shaymardanov@cspace.uz', status: 'active' },
      { employee_id: 'EMP038', full_name: 'Samad Gaipov', position: 'Sales Intern', level: 'junior', branch_id: null, salary: 4500000, email: 'samad.gaipov@cspace.uz', status: 'active' },
      { employee_id: 'EMP039', full_name: 'Said Florist Chust', position: 'Florist', level: 'senior', branch_id: 'chust', salary: 1400000, email: 'said.chust@cspace.uz', status: 'active' },
      { employee_id: 'EMP040', full_name: 'Gavhar Abdigayeva', position: 'AXO', level: 'middle', branch_id: 'yandex', salary: 4500000, email: 'gavhar.abdigayeva@cspace.uz', status: 'active' },
      { employee_id: 'EMP041', full_name: 'Saodat Rahimova', position: 'AXO', level: 'middle', branch_id: 'yandex', salary: 4500000, email: 'saodat.rahimova@cspace.uz', status: 'active' },
      { employee_id: 'EMP042', full_name: 'Xurshida Muxamedjanova', position: 'AXO', level: 'middle', branch_id: 'yandex', salary: 3000000, email: 'xurshida.muxamedjanova@cspace.uz', status: 'active' },
      { employee_id: 'EMP043', full_name: 'Nabijon Turgunov', position: 'CEO Assistant', level: 'middle', branch_id: 'chust', salary: 10000000, email: 'nabijon.turgunov@cspace.uz', status: 'active' },
      { employee_id: 'EMP044', full_name: 'Javlon Toshpulatov', position: 'BM', level: 'middle', branch_id: 'chust', salary: 5000000, email: 'javlon.toshpulatov@cspace.uz', status: 'active' },
      { employee_id: 'EMP045', full_name: 'Mohigul Yuldoshova', position: 'AXO', level: 'middle', branch_id: 'chust', salary: 3500000, email: 'mohigul.yuldoshova@cspace.uz', status: 'active' },
      { employee_id: 'EMP046', full_name: 'Jamshid Ibragimov', position: 'NS', level: 'junior', branch_id: 'chust', salary: 3000000, email: 'jamshid.ibragimov@cspace.uz', status: 'active' },
      { employee_id: 'EMP047', full_name: 'Suxrob Usmonov', position: 'NS', level: 'junior', branch_id: 'chust', salary: 3000000, email: 'suxrob.usmonov@cspace.uz', status: 'active' },
      { employee_id: 'EMP048', full_name: 'Ulbosin Usarova', position: 'AXO', level: 'middle', branch_id: 'chust', salary: 3500000, email: 'ulbosin.usarova@cspace.uz', status: 'active' },
      { employee_id: 'EMP049', full_name: 'Ubaydullo Pulat', position: 'Business Developer', level: 'executive', branch_id: null, salary: 19500000, email: 'ubaydullo.pulat@cspace.uz', status: 'active' },
      { employee_id: 'EMP050', full_name: 'Said Florist Aero', position: 'Florist', level: 'senior', branch_id: 'aero', salary: 1000000, email: 'said.aero@cspace.uz', status: 'active' },
      { employee_id: 'EMP051', full_name: 'Abubakr Sodiqov', position: 'NS', level: 'junior', branch_id: 'aero', salary: 3000000, email: 'abubakr.sodiqov@cspace.uz', status: 'active' },
      { employee_id: 'EMP052', full_name: 'Oyxol Egamberdiyeva', position: 'AXO', level: 'middle', branch_id: 'aero', salary: 4000000, email: 'oyxol.egamberdiyeva@cspace.uz', status: 'active' },
      { employee_id: 'EMP053', full_name: 'Humoyun Odilov', position: 'CM', level: 'junior', branch_id: 'aero', salary: 4000000, email: 'humoyun.odilov@cspace.uz', status: 'active' },
      { employee_id: 'EMP054', full_name: 'Nargiza Rahimova', position: 'AXO', level: 'middle', branch_id: 'beruniy', salary: 4500000, email: 'nargiza.rahimova@cspace.uz', status: 'active' },
      { employee_id: 'EMP055', full_name: 'Said Florist Beruniy', position: 'Florist', level: 'senior', branch_id: 'beruniy', salary: 1000000, email: 'said.beruniy@cspace.uz', status: 'active' },
      { employee_id: 'EMP056', full_name: 'Humora Urokboyeva', position: 'AXO', level: 'junior', branch_id: 'muqimiy', salary: 3000000, email: 'humora.urokboyeva@cspace.uz', status: 'active' },
      { employee_id: 'EMP057', full_name: 'Said Florist Muqimiy', position: 'Florist', level: 'senior', branch_id: 'muqimiy', salary: 700000, email: 'said.muqimiy@cspace.uz', status: 'active' },
      { employee_id: 'EMP058', full_name: 'Azizbek Samiyev', position: 'CM', level: 'junior', branch_id: 'muqimiy', salary: 4000000, email: 'azizbek.samiyev@cspace.uz', status: 'active' },
    ];

    // Upsert all employees
    const { error: empError } = await supabase.from('employees').upsert(employees, {
      onConflict: 'employee_id',
      ignoreDuplicates: false
    });

    if (empError) {
      return NextResponse.json({ error: 'Employee import failed', details: empError.message }, { status: 500 });
    }

    // Get count
    const { data: allEmps } = await supabase.from('employees').select('employee_id').eq('status', 'active');

    return NextResponse.json({
      success: true,
      message: `Imported ${employees.length} employees`,
      totalInDb: allEmps?.length || 0,
      branches: branches.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Import failed', details: String(error) }, { status: 500 });
  }
}
