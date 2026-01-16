// Static branch data for fallback when Supabase is not configured
// This data mirrors the Supabase branches table

export interface StaticBranch {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export const branches: StaticBranch[] = [
  { id: 'yunusabad', name: 'C-Space Yunusabad', address: 'Yunusabad District, Tashkent', latitude: 41.3678, longitude: 69.2956 },
  { id: 'labzak', name: 'C-Space Labzak', address: 'Labzak Street, Mirzo Ulugbek', latitude: 41.3456, longitude: 69.3012 },
  { id: 'elbek', name: 'C-Space Elbek', address: 'Elbek Street, Yakkasaray', latitude: 41.2876, longitude: 69.2654 },
  { id: 'chust', name: 'C-Space Chust', address: 'Chust Street, Tashkent', latitude: 41.2989, longitude: 69.2432 },
  { id: 'maksim_gorkiy', name: 'C-Space Maksim Gorkiy', address: 'Maksim Gorkiy Street, Tashkent', latitude: 41.3123, longitude: 69.2796 },
  { id: 'aero', name: 'C-Space Aero', address: 'Near Tashkent Airport', latitude: 41.2574, longitude: 69.2814 },
  { id: 'orient', name: 'C-Space Orient', address: 'Orient District, Tashkent', latitude: 41.3234, longitude: 69.2567 },
  { id: 'muqimiy', name: 'C-Space Muqimiy', address: 'Muqumiy Street, Yunusabad', latitude: 41.3567, longitude: 69.2845 },
  { id: 'yunus_obod', name: 'C-Space Yunus-Obod', address: 'Yunus-Obod District, Tashkent', latitude: 41.3789, longitude: 69.3123 },
];
