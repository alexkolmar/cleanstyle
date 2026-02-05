/**
 * ThemeManager для GitHub Pages с поддержкой двух CSS-файлов (style.css + style_cs.css)
 * как в оригинальном rusff
 */
const ThemeManager = {
 availableThemes: {}, // { 'cyrodiil': { main: '...', secondary: '...', description: '...' } }
 currentTheme: 'default',
 cssLinks: [], // Ссылки на все CSS-элементы
 themeDescriptions: {}, // Кэш загруженных описаний тем
 isIndexPage: false, // Флаг страницы index.html

 async init() {
  console.log('🔄 Инициализация ThemeManager (rusff-версия)...');

  // Проверяем, находимся ли мы на главной странице
  this.isIndexPage = window.location.pathname.includes('index.html') || 
                    window.location.pathname === '/' || 
                    window.location.pathname.endsWith('/');

  // 1. Находим ВСЕ темы с двумя CSS-файлами
  await this.discoverAllThemes();

  // 2. Создаём отдельный link для style_cs.css если его нет
  this.setupSecondaryCssLink();

  // 3. Восстанавливаем сохранённую тему
  const savedTheme = localStorage.getItem('forum-theme');
  this.currentTheme = savedTheme && this.availableThemes[savedTheme]
   ? savedTheme
   : 'default';

  // 4. Создаём и настраиваем переключатель
  this.setupThemeSelector();

  // 5. Применяем текущую тему
  await this.applyTheme(this.currentTheme);

  console.log('✅ ThemeManager готов. Темы:', Object.keys(this.availableThemes));
 },

 // Находит темы и проверяет оба CSS-файла
 async discoverAllThemes() {
  this.availableThemes = {};

  try {
   // Получаем список папок в themes/
   const response = await fetch('https://api.github.com/repos/alexkolmar/cleanstyle/contents/themes');
   if (!response.ok) throw new Error('GitHub API недоступен');

   const data = await response.json();

   // Для каждой папки проверяем наличие CSS-файлов
   for (const item of data) {
    if (item.type === 'dir') {
     const themeName = item.name;
     const themeData = {
      main: `themes/${themeName}/style.css`,
      secondary: `themes/${themeName}/style_cs.css`,
      description: `themes/${themeName}/descriptions.json`
     };

     // Проверяем существование основного файла
     const mainExists = await this.checkFileExists(themeData.main);
     if (mainExists) {
      this.availableThemes[themeName] = themeData;
      console.log(`✓ Тема "${themeName}" добавлена`);
     } else {
      console.log(`✗ Тема "${themeName}" пропущена (нет style.css)`);
     }
    }
   }
  } catch (error) {
   console.error('❌ Ошибка при сканировании тем:', error);
   await this.fallbackDiscovery();
  }
 },

 // Проверяет существование файла
 async checkFileExists(url) {
  try {
   const response = await fetch(url, { method: 'HEAD' });
   return response.ok;
  } catch (error) {
   return false;
  }
 },

 // Резервное обнаружение тем
 async fallbackDiscovery() {
  const knownThemes = ['clean_new', 'clean_old', 'cyrodiil', 'pinot_grigio'];

  for (const themeName of knownThemes) {
   const mainCss = `themes/${themeName}/style.css`;
   const mainExists = await this.checkFileExists(mainCss);

   if (mainExists) {
    this.availableThemes[themeName] = {
     main: mainCss,
     secondary: `themes/${themeName}/style_cs.css`,
     description: `themes/${themeName}/descriptions.json`
    };
   }
  }
 },

 // Создаёт отдельный link для style_cs.css если его нет
 setupSecondaryCssLink() {
  // Ищем существующий link для style_cs.css
  let secondaryLink = document.querySelector('link[href*="style_cs.css"]');

  // Если нет - создаём
  if (!secondaryLink) {
   secondaryLink = document.createElement('link');
   secondaryLink.rel = 'stylesheet';
   secondaryLink.id = 'theme-stylesheet-secondary';
   document.head.appendChild(secondaryLink);
  }

  this.cssLinks = [
   document.getElementById('theme-stylesheet'),
   secondaryLink
  ];
 },

 // Создаёт переключатель тем
 setupThemeSelector() {
  let select = document.getElementById('theme-select');
  if (!select) select = this.createThemeSelector();

  select.innerHTML = '';
  const themeNames = Object.keys(this.availableThemes).sort();

  themeNames.forEach(themeName => {
   const option = document.createElement('option');
   option.value = themeName;
   option.textContent = this.formatThemeName(themeName);
   if (themeName === this.currentTheme) option.selected = true;
   select.appendChild(option);
  });

  select.addEventListener('change', async (e) => {
   const newTheme = e.target.value;
   await this.applyTheme(newTheme);
   localStorage.setItem('forum-theme', newTheme);
  });
 },

 createThemeSelector() {
  const container = document.querySelector('.theme-demo-panel') || document.body;
  container.insertAdjacentHTML('afterbegin', `
            <div class="theme-demo-panel">
                <label for="theme-select">Тема:</label>
                <select id="theme-select"></select>
                <small style="margin-left:10px;color:#666">
                    <span id="theme-count">${Object.keys(this.availableThemes).length}</span> тем
                </small>
            </div>
        `);
  return document.getElementById('theme-select');
 },

 formatThemeName(themeName) {
  const names = {
   'clean_new': 'Чистая (новая)',
   'clean_old': 'Чистая (старая)',
   'cyrodiil': 'Сиродиил',
   'pinot_grigio': 'Pinot Grigio'
  };

  // Если есть специальное название - используем его
  if (names[themeName]) return names[themeName];

  // Автоматическое форматирование для остальных
  return themeName
   .replace(/_/g, ' ')                     // Заменяем подчёркивания
   .replace(/(^|\s)\w/g, char => char.toUpperCase()) // Первые буквы заглавные
   .replace(/\b(?:And|Or|The|Of)\b/g, word => word.toLowerCase()); // Артикли строчные
 },

 // ОСНОВНОЙ МЕТОД: Применяет тему с двумя CSS-файлами
 async applyTheme(themeName) {
  console.log(`🎨 Применяем тему: ${themeName} (2 CSS-файла)`);

  const themeData = this.availableThemes[themeName];
  if (!themeData) {
   console.error('❌ Данные темы не найдены:', themeName);
   return;
  }

  // 1. Удаляем описания предыдущей темы (только на главной)
  if (this.isIndexPage) {
   this.clearPreviousDescriptions();
  }

  // 2. Загружаем основной style.css
  await this.loadCssFile(themeData.main, this.cssLinks[0]);

  // 3. Загружаем дополнительный style_cs.css (если существует)
  const secondaryExists = await this.checkFileExists(themeData.secondary);
  if (secondaryExists) {
   await this.loadCssFile(themeData.secondary, this.cssLinks[1]);
  } else {
   // Если файла нет - отключаем ссылку
   this.cssLinks[1].href = '';
   console.log(`ℹ️ style_cs.css для темы "${themeName}" не найден, пропускаем`);
  }

  // 4. Загружаем HTML-блоки и описание одновременно (если на главной)
  const loadPromises = [this.loadThemeBlocks(themeName)];
  
  if (this.isIndexPage) {
   loadPromises.push(this.loadThemeDescriptions(themeName, themeData.description));
  }
  
  await Promise.all(loadPromises);

  // 5. Обновляем текущую тему
  this.currentTheme = themeName;

  // 6. Обновляем селектор
  const select = document.getElementById('theme-select');
  if (select) select.value = themeName;
 },

 // Загружает CSS-файл с обработкой ошибок
 async loadCssFile(url, linkElement) {
  return new Promise((resolve) => {
   linkElement.onload = () => {
    console.log(`✅ CSS загружен: ${url}`);
    resolve(true);
   };
   linkElement.onerror = () => {
    console.error(`❌ Ошибка загрузки CSS: ${url}`);
    resolve(false);
   };
   linkElement.href = url;
  });
 },

 // Загружает HTML-блоки и оборачивает в .container если нужно
 async loadThemeBlocks(themeName) {
  const blocks = [
   { id: 'html-header', file: 'header.html', wrap: false },
   { id: 'html-footer', file: 'footer.html', wrap: true },
   { id: 'pun-announcement', file: 'announcement.html', wrap: true }
  ];

  const themeFolder = `themes/${themeName}/`;

  for (const block of blocks) {
   const container = document.getElementById(block.id);
   if (!container) {
    console.log(`⚠️ Контейнер #${block.id} не найден`);
    continue;
   }

   if (!themeFolder) {
    container.innerHTML = '';
    continue;
   }

   const filePath = `${themeFolder}${block.file}`;
   try {
    const response = await fetch(filePath);
    if (response.ok) {
     const content = await response.text();

     // Ключевое изменение: проверяем и оборачиваем в .container
     if (content.trim() && block.wrap && !this.hasContainerWrapper(content)) {
      container.innerHTML = `<div class="container">${content}</div>`;
      console.log(`✓ ${block.id} загружен и обёрнут в .container`);
     } else {
      container.innerHTML = content;
      console.log(`✓ ${block.id} загружен (без обёртки)`);
     }
    } else {
     container.innerHTML = '';
     console.log(`✗ Файл ${filePath} не найден, очищаем ${block.id}`);
    }
   } catch (error) {
    container.innerHTML = '';
    console.log(`✗ Ошибка загрузки ${filePath}:`, error);
   }
  }
 },

 // Новый вспомогательный метод: Проверяет, обёрнут ли уже контент в .container
 hasContainerWrapper(content) {
  const trimmed = content.trim();
  // Проверяем, начинается ли содержимое с div class="container"
  return trimmed.startsWith('<div class="container"') ||
   trimmed.startsWith("<div class='container");
 },

 // Загружает описания форумов из JSON файла
 async loadThemeDescriptions(themeName, descriptionPath) {
  // Используем кэшированное описание, если оно уже загружено
  if (this.themeDescriptions[themeName]) {
   this.insertForumDescriptions(this.themeDescriptions[themeName]);
   return;
  }

  try {
   const response = await fetch(descriptionPath);
   if (!response.ok) {
    if (response.status === 404) {
     console.log(`ℹ️ Файл описаний не найден: ${descriptionPath}`);
    } else {
     console.warn(`⚠️ Ошибка загрузки описаний темы ${themeName}:`, response.status);
    }
    return;
   }

   const data = await response.json();
   this.themeDescriptions[themeName] = data;
   this.insertForumDescriptions(data);
   console.log(`✅ Описания форумов для темы "${themeName}" загружены`);

  } catch (error) {
   console.error(`❌ Ошибка при загрузке описаний для темы "${themeName}":`, error);
  }
 },

 // Вставляет описания форумов в DOM
 insertForumDescriptions(descriptionsData) {
  if (!descriptionsData || typeof descriptionsData !== 'object') {
   console.warn('⚠️ Данные описаний не найдены или имеют неверный формат');
   return;
  }

  // Для каждого ID форума в JSON
  for (const forumId in descriptionsData) {
   if (!descriptionsData.hasOwnProperty(forumId)) continue;
   
   const forumElement = document.getElementById(forumId);
   if (!forumElement) {
    console.log(`⚠️ Форум с ID "${forumId}" не найден на странице`);
    continue;
   }

   // Ищем h3 внутри элемента форума
   const h3 = forumElement.querySelector('h3');
   if (!h3) {
    console.log(`⚠️ Заголовок h3 не найден в форуме "${forumId}"`);
    continue;
   }

   // Создаём контейнер для описания
   const descriptionContainer = document.createElement('div');
   descriptionContainer.className = 'forum-description';
   descriptionContainer.setAttribute('data-forum', forumId);
   descriptionContainer.innerHTML = descriptionsData[forumId];

   // Вставляем после h3
   h3.insertAdjacentElement('afterend', descriptionContainer);
   console.log(`✓ Описание добавлено для форума "${forumId}"`);
  }
 },

 // Удаляет описания предыдущей темы
 clearPreviousDescriptions() {
  // Находим все контейнеры с описаниями форумов
  const oldDescriptions = document.querySelectorAll('.forum-description[data-forum]');
  
  oldDescriptions.forEach(description => {
   description.remove();
   console.log(`🗑️ Удалено старое описание для форума "${description.getAttribute('data-forum')}"`);
  });
 }
};

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
 // Сначала удаляем старые скрипты с ошибками
 const badScripts = document.querySelectorAll('script[src*="pun_options"], script[src*="quickpost"]');
 badScripts.forEach(script => script.remove());

 // Запускаем менеджер тем
 setTimeout(() => ThemeManager.init(), 100);
});