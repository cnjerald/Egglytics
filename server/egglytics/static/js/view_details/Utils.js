export class Utils {
    static getCSRFToken() {
        const name = 'csrftoken';
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = $.trim(cookie);
            if (cookie.startsWith(name + '=')) {
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
        return '';
    }

    static getFlag() {
        return JSON.parse(localStorage.getItem("flag"));
    }
}