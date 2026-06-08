// 节流函数
export const throttle = (fn, delay) => {
    let lastTime = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastTime >= delay) {
            fn.apply(this, args);
            lastTime = now;
        }
    };
};

// 统一错误提示
export const showError = (message) => {
    alert(message);
    console.error(message);
};