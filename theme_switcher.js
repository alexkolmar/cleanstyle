document.addEventListener('DOMContentLoaded', function () {
 const themeSelect = document.getElementById('theme-select');
 const themeLink = document.getElementById('theme-stylesheet');

 // Загружаем сохранённую тему или оставляем стандартную
 const savedTheme = localStorage.getItem('demo-forum-theme') || 'style.css';
 if (themeLink) themeLink.href = savedTheme;
 if (themeSelect) themeSelect.value = savedTheme;

 // Меняем тему при выборе
 if (themeSelect) {
  themeSelect.addEventListener('change', function () {
   const newTheme = this.value;
   if (themeLink) themeLink.href = newTheme;
   localStorage.setItem('demo-forum-theme', newTheme);

   // Простая анимация для наглядности
   document.body.style.opacity = '0.8';
   setTimeout(() => { document.body.style.opacity = '1'; }, 200);
  });
 }

 // Подсвечиваем демо-ссылки при наведении (опционально)
 const demoLinks = document.querySelectorAll('.demo-highlight');
 demoLinks.forEach(link => {
  link.addEventListener('mouseenter', () => link.style.backgroundColor = 'rgba(255, 255, 0, 0.2)');
  link.addEventListener('mouseleave', () => link.style.backgroundColor = '');
 });
});