import { supabaseAdmin, isSupabaseAdminConfigured, BotLearningContent, BotMessageTemplate, BotButtonLabel, BotSettings, LocalizedContent } from './connection';

// ============================================
// TELEGRAM BOT CONTENT MANAGEMENT
// ============================================

// Learning Content CRUD
export async function getBotLearningContent(): Promise<BotLearningContent[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_learning_content')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching learning content:', error);
    return [];
  }

  return data || [];
}

export async function createBotLearningContent(
  content: Omit<BotLearningContent, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; content?: BotLearningContent; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_learning_content')
    .insert(content)
    .select()
    .single();

  if (error) {
    console.error('Error creating learning content:', error);
    return { success: false, error: error.message };
  }

  return { success: true, content: data };
}

export async function updateBotLearningContent(
  id: string,
  updates: Partial<Omit<BotLearningContent, 'id' | 'created_at'>>
): Promise<{ success: boolean; content?: BotLearningContent; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_learning_content')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating learning content:', error);
    return { success: false, error: error.message };
  }

  return { success: true, content: data };
}

export async function deleteBotLearningContent(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('bot_learning_content')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting learning content:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Message Templates CRUD
export async function getBotMessageTemplates(): Promise<BotMessageTemplate[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_message_templates')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    console.error('Error fetching message templates:', error);
    return [];
  }

  return data || [];
}

export async function createBotMessageTemplate(
  template: Omit<BotMessageTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; template?: BotMessageTemplate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_message_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('Error creating message template:', error);
    return { success: false, error: error.message };
  }

  return { success: true, template: data };
}

export async function updateBotMessageTemplate(
  id: string,
  updates: Partial<Omit<BotMessageTemplate, 'id' | 'created_at'>>
): Promise<{ success: boolean; template?: BotMessageTemplate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_message_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating message template:', error);
    return { success: false, error: error.message };
  }

  return { success: true, template: data };
}

export async function deleteBotMessageTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('bot_message_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting message template:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Button Labels CRUD
export async function getBotButtonLabels(): Promise<BotButtonLabel[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_button_labels')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    console.error('Error fetching button labels:', error);
    return [];
  }

  return data || [];
}

export async function createBotButtonLabel(
  label: Omit<BotButtonLabel, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; label?: BotButtonLabel; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_button_labels')
    .insert(label)
    .select()
    .single();

  if (error) {
    console.error('Error creating button label:', error);
    return { success: false, error: error.message };
  }

  return { success: true, label: data };
}

export async function updateBotButtonLabel(
  id: string,
  updates: Partial<Omit<BotButtonLabel, 'id' | 'created_at'>>
): Promise<{ success: boolean; label?: BotButtonLabel; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_button_labels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating button label:', error);
    return { success: false, error: error.message };
  }

  return { success: true, label: data };
}

export async function deleteBotButtonLabel(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('bot_button_labels')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting button label:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Bot Settings CRUD
export async function getBotSettings(): Promise<BotSettings[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    console.error('Error fetching bot settings:', error);
    return [];
  }

  return data || [];
}

export async function updateBotSetting(
  key: string,
  value: string
): Promise<{ success: boolean; setting?: BotSettings; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    console.error('Error updating bot setting:', error);
    return { success: false, error: error.message };
  }

  return { success: true, setting: data };
}

export async function upsertBotSetting(
  key: string,
  value: string,
  description?: string
): Promise<{ success: boolean; setting?: BotSettings; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('bot_settings')
    .upsert({
      key,
      value,
      description: description || '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting bot setting:', error);
    return { success: false, error: error.message };
  }

  return { success: true, setting: data };
}
