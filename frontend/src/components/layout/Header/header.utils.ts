// [용도] 다크모드 전환을 담당하는 함수
// [주의사항] localStorage에 저장하여 새로고침해도 유지되게 함

export const toggleDarkMode = () => {
  const html = document.documentElement;

  if (html.classList.contains("dark")) {
    html.classList.remove("dark");
    localStorage.setItem("theme", "light");
  } else {
    html.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }
};

export const initializeTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
  }
};
