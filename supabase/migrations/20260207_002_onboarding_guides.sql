-- ============================================
-- ONBOARDING GUIDES SYSTEM
-- Contextual "How it works?" walkthroughs
-- per page, multi-language (EN/RU/UZ)
-- ============================================

-- 1. Guides (one per page/module)
CREATE TABLE IF NOT EXISTS onboarding_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,           -- 'requests-hub', 'transactions', etc.
  page_path TEXT NOT NULL,                   -- '/reception/requests'
  title_en TEXT NOT NULL DEFAULT '',
  title_ru TEXT NOT NULL DEFAULT '',
  title_uz TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  subtitle_ru TEXT NOT NULL DEFAULT '',
  subtitle_uz TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_show BOOLEAN NOT NULL DEFAULT true,   -- show on first visit
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Steps (ordered slides within a guide)
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES onboarding_guides(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_ru TEXT NOT NULL DEFAULT '',
  title_uz TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_ru TEXT NOT NULL DEFAULT '',
  body_uz TEXT NOT NULL DEFAULT '',
  tip_en TEXT,                               -- optional tip/hint
  tip_ru TEXT,
  tip_uz TEXT,
  features_en JSONB DEFAULT '[]'::jsonb,     -- [{icon, text}]
  features_ru JSONB DEFAULT '[]'::jsonb,
  features_uz JSONB DEFAULT '[]'::jsonb,
  animation_key TEXT NOT NULL DEFAULT 'default', -- CSS animation identifier
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(guide_id, step_number)
);

-- 3. User progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES onboarding_guides(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_step INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, guide_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_guide ON onboarding_steps(guide_id, step_number);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_guide ON onboarding_progress(guide_id);

-- RLS Policies
ALTER TABLE onboarding_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Guides & steps: readable by all authenticated
CREATE POLICY "onboarding_guides_read" ON onboarding_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "onboarding_steps_read" ON onboarding_steps FOR SELECT TO authenticated USING (true);

-- Progress: users own their rows
CREATE POLICY "onboarding_progress_select" ON onboarding_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "onboarding_progress_insert" ON onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "onboarding_progress_update" ON onboarding_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- SEED: Requests Hub Guide
-- ============================================
INSERT INTO onboarding_guides (module_key, page_path, title_en, title_ru, title_uz, subtitle_en, subtitle_ru, subtitle_uz, sort_order)
VALUES (
  'requests-hub',
  '/reception/requests',
  'Requests Hub Guide',
  'Гид по Центру Заявок',
  'So''rovlar markazi qo''llanmasi',
  'Learn how to manage all request types',
  'Узнайте, как управлять всеми типами заявок',
  'Barcha turdagi so''rovlarni boshqarishni o''rganing',
  1
);

-- Get the guide ID for steps
DO $$
DECLARE
  guide_uuid UUID;
BEGIN
  SELECT id INTO guide_uuid FROM onboarding_guides WHERE module_key = 'requests-hub';

  -- Step 1: Overview
  INSERT INTO onboarding_steps (guide_id, step_number, title_en, title_ru, title_uz, body_en, body_ru, body_uz, features_en, features_ru, features_uz, animation_key)
  VALUES (guide_uuid, 1,
    'Your Request Command Center',
    'Ваш центр управления заявками',
    'So''rovlar boshqaruv markazingiz',
    'The Requests Hub is your central place to manage all types of requests. Each card shows the count of active items and links to the detailed list.',
    'Центр заявок — ваше единое место для управления всеми типами заявок. Каждая карточка показывает количество активных элементов и ведёт к детальному списку.',
    'So''rovlar markazi — barcha turdagi so''rovlarni boshqarish uchun yagona joy. Har bir karta faol elementlar sonini ko''rsatadi va batafsil ro''yxatga olib boradi.',
    '[{"icon":"🧾","text":"Accounting — payments, reconciliations, confirmations","color":"purple"},{"icon":"⚖️","text":"Legal — contracts, agreements, registrations","color":"blue"},{"icon":"🔧","text":"Maintenance — repairs, HVAC, electrical, cleaning","color":"orange"}]'::jsonb,
    '[{"icon":"🧾","text":"Бухгалтерия — платежи, сверки, подтверждения","color":"purple"},{"icon":"⚖️","text":"Юридические — договоры, соглашения, регистрации","color":"blue"},{"icon":"🔧","text":"Обслуживание — ремонт, HVAC, электрика, уборка","color":"orange"}]'::jsonb,
    '[{"icon":"🧾","text":"Buxgalteriya — to''lovlar, solishtirishlar, tasdiqlashlar","color":"purple"},{"icon":"⚖️","text":"Yuridik — shartnomalar, kelishuvlar, ro''yxatga olish","color":"blue"},{"icon":"🔧","text":"Xizmat ko''rsatish — ta''mirlash, HVAC, elektr, tozalash","color":"orange"}]'::jsonb,
    'hub-overview'
  );

  -- Step 2: Accounting
  INSERT INTO onboarding_steps (guide_id, step_number, title_en, title_ru, title_uz, body_en, body_ru, body_uz, tip_en, tip_ru, tip_uz, features_en, features_ru, features_uz, animation_key)
  VALUES (guide_uuid, 2,
    'Accounting Requests',
    'Бухгалтерские заявки',
    'Buxgalteriya so''rovlari',
    'Track financial requests like reconciliations, payment approvals, and confirmations. Each request goes through a workflow from submission to completion.',
    'Отслеживайте финансовые заявки: сверки, согласования платежей и подтверждения. Каждая заявка проходит путь от подачи до завершения.',
    'Moliyaviy so''rovlarni kuzating: solishtirishlar, to''lov tasdiqlanishlari. Har bir so''rov topshirishdan yakunlashgacha bo''lgan jarayondan o''tadi.',
    'You can filter by status using the quick tabs at the top of the list!',
    'Фильтруйте по статусу с помощью быстрых вкладок вверху списка!',
    'Ro''yxat tepasidagi tezkor tablar orqali holat bo''yicha filtrlang!',
    '[{"icon":"✓","text":"3 types: Reconciliation, Payment, Confirmation","color":"green"},{"icon":"→","text":"Status flow: Pending → In Progress → Approved → Done","color":"blue"},{"icon":"+","text":"Click \"New Request\" to create one","color":"purple"}]'::jsonb,
    '[{"icon":"✓","text":"3 типа: Сверка, Платёж, Подтверждение","color":"green"},{"icon":"→","text":"Статус: Ожидание → В работе → Одобрено → Готово","color":"blue"},{"icon":"+","text":"Нажмите «Новая заявка» для создания","color":"purple"}]'::jsonb,
    '[{"icon":"✓","text":"3 tur: Solishtirish, To''lov, Tasdiqlash","color":"green"},{"icon":"→","text":"Holat: Kutilmoqda → Jarayonda → Tasdiqlangan → Tayyor","color":"blue"},{"icon":"+","text":"Yangi so''rov yaratish uchun \"Yangi so''rov\" tugmasini bosing","color":"purple"}]'::jsonb,
    'accounting-flow'
  );

  -- Step 3: Legal
  INSERT INTO onboarding_steps (guide_id, step_number, title_en, title_ru, title_uz, body_en, body_ru, body_uz, tip_en, tip_ru, tip_uz, features_en, features_ru, features_uz, animation_key)
  VALUES (guide_uuid, 3,
    'Legal Requests',
    'Юридические заявки',
    'Yuridik so''rovlar',
    'Manage contracts, supplementary agreements, terminations, and registrations. Track every legal document from submission through review to completion.',
    'Управляйте договорами, допсоглашениями, расторжениями и регистрациями. Отслеживайте каждый документ от подачи до завершения.',
    'Shartnomalar, qo''shimcha kelishuvlar, bekor qilish va ro''yxatga olishlarni boshqaring. Har bir hujjatni topshirishdan ko''rib chiqishgacha kuzating.',
    'Use the search bar to find requests by number or name quickly.',
    'Используйте поиск для быстрого нахождения заявок по номеру или названию.',
    'So''rovlarni raqam yoki nom bo''yicha tezda topish uchun qidiruv satridan foydalaning.',
    '[{"icon":"📝","text":"5 types: Contracts, Supplements, Terminations, Registrations, Guarantees","color":"blue"},{"icon":"👤","text":"Each request gets assigned to a responsible person","color":"green"}]'::jsonb,
    '[{"icon":"📝","text":"5 типов: Договоры, Допсоглашения, Расторжения, Регистрации, Гарантийные письма","color":"blue"},{"icon":"👤","text":"Каждая заявка назначается ответственному лицу","color":"green"}]'::jsonb,
    '[{"icon":"📝","text":"5 tur: Shartnomalar, Qo''shimchalar, Bekor qilish, Ro''yxatga olish, Kafolat xatlari","color":"blue"},{"icon":"👤","text":"Har bir so''rov mas''ul shaxsga tayinlanadi","color":"green"}]'::jsonb,
    'legal-flow'
  );

  -- Step 4: Maintenance
  INSERT INTO onboarding_steps (guide_id, step_number, title_en, title_ru, title_uz, body_en, body_ru, body_uz, features_en, features_ru, features_uz, animation_key)
  VALUES (guide_uuid, 4,
    'Maintenance Issues',
    'Заявки на обслуживание',
    'Xizmat ko''rsatish muammolari',
    'Report and track facility issues — from a broken AC to a leaky pipe. Set urgency levels and monitor SLA deadlines to keep your workspace running smoothly.',
    'Сообщайте и отслеживайте проблемы с помещением — от сломанного кондиционера до протечки. Устанавливайте уровни срочности и следите за дедлайнами SLA.',
    'Bino muammolarini xabar bering va kuzating — buzilgan konditsionerdan tortib quvur oqishigacha. Shoshilinchlik darajalarini belgilang va SLA muddatlarini nazorat qiling.',
    '[{"icon":"🔴","text":"4 urgency levels: Critical, High, Medium, Low","color":"red"},{"icon":"⏱️","text":"SLA tracking — see time remaining before breach","color":"blue"},{"icon":"📍","text":"Include location description for faster resolution","color":"green"}]'::jsonb,
    '[{"icon":"🔴","text":"4 уровня срочности: Критический, Высокий, Средний, Низкий","color":"red"},{"icon":"⏱️","text":"SLA-отслеживание — видно оставшееся время","color":"blue"},{"icon":"📍","text":"Укажите местоположение для быстрого решения","color":"green"}]'::jsonb,
    '[{"icon":"🔴","text":"4 shoshilinchlik darajasi: Muhim, Yuqori, O''rtacha, Past","color":"red"},{"icon":"⏱️","text":"SLA kuzatuvi — buzilishgacha qolgan vaqt ko''rinadi","color":"blue"},{"icon":"📍","text":"Tezroq hal qilish uchun joylashuvni ko''rsating","color":"green"}]'::jsonb,
    'maintenance-flow'
  );

  -- Step 5: Ready!
  INSERT INTO onboarding_steps (guide_id, step_number, title_en, title_ru, title_uz, body_en, body_ru, body_uz, features_en, features_ru, features_uz, animation_key)
  VALUES (guide_uuid, 5,
    'You''re Ready!',
    'Вы готовы!',
    'Siz tayyorsiz!',
    'You now know how to navigate the Requests Hub. Click on any card to dive into that section. You can always come back to this guide by clicking "How it works?" at the top.',
    'Теперь вы знаете, как работает Центр Заявок. Нажмите на любую карточку для перехода. Кнопка «Как это работает?» всегда доступна.',
    'Endi siz So''rovlar markazini qanday ishlatishni bilasiz. Istalgan kartaga bosib, bo''limga o''ting. "Bu qanday ishlaydi?" tugmasi har doim mavjud.',
    '[{"icon":"✓","text":"Click any request card to open its full list","color":"green"},{"icon":"+","text":"Use \"New Request\" inside each section to create","color":"blue"},{"icon":"?","text":"Every page has its own \"How it works?\" guide","color":"purple"}]'::jsonb,
    '[{"icon":"✓","text":"Нажмите на карточку для открытия списка","color":"green"},{"icon":"+","text":"Используйте «Новая заявка» в каждом разделе","color":"blue"},{"icon":"?","text":"На каждой странице есть свой гид «Как это работает?»","color":"purple"}]'::jsonb,
    '[{"icon":"✓","text":"Istalgan kartaga bosib, to''liq ro''yxatni oching","color":"green"},{"icon":"+","text":"Har bir bo''limda \"Yangi so''rov\" tugmasidan foydalaning","color":"blue"},{"icon":"?","text":"Har bir sahifada o''z \"Bu qanday ishlaydi?\" qo''llanmasi bor","color":"purple"}]'::jsonb,
    'celebration'
  );
END $$;
