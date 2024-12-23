const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const updateIcon = (theme) => {
	if (theme === 'light') {
		themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
	} else {
		themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
	}
};
updateIcon(document.documentElement.getAttribute('data-bs-theme'));
window.addEventListener('load', () => {
	body.classList.remove('theme-initial');
});
themeToggle.addEventListener('click', () => {
	const currentTheme = body.getAttribute('data-bs-theme');
	const newTheme = currentTheme === 'light' ? 'dark' : 'light';
	body.setAttribute('data-bs-theme', newTheme);
	updateIcon(newTheme);
	localStorage.setItem('theme', newTheme);
});