//
// 
// 
// FOR SERVER COMMUNICATION
// 
// 
//

function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return '';
}

export async function addPointToServer(imageId, x, y) {
    try {
        const response = await fetch(`/add_egg_to_db_point/${imageId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ x, y })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server says:", data.message || data.STATUS);
        return true;

    } catch (err) {
        console.error("Server offline, storing point locally:", err);
        return false;
    }
}

export async function removePointFromServer(imageId, x, y) {
    try {
        const response = await fetch(`/remove_egg_from_db_point/${imageId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ x, y })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server says:", data.message || data.STATUS);
        return true;

    } catch (err) {
        console.warn("Deletion failed:", err);
        return false;
    }
}

export async function addRectToServer(imageId, x1, y1, x2, y2) {
    try {
        const response = await fetch(`/add_egg_to_db_rect/${imageId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ x1, y1, x2, y2 })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server says:", data.message || data.STATUS);
        return true;

    } catch (err) {
        console.error("Server offline, storing rect locally:", err);
        return false;
    }
}

export async function removeRectFromServer(imageId, x1, y1, x2, y2) {
    try {
        const response = await fetch(`/remove_egg_from_db_rect/${imageId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ x1, y1, x2, y2 })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server says:", data.message || data.STATUS);
        return true;

    } catch (err) {
        console.warn("Deletion failed:", err);
        return false;
    }
}

export async function saveGridToServer(image_id,x,y){
    console.log("sgfs",image_id,x,y);
    try{
        const response = await fetch(`/toggleGrid/${image_id}/`,{
            method:"POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ x,y })
        }) 

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server says:", data.message || data.STATUS);
        return true;
    } catch (err){
        console.warn("Saving failed",err);
        return false;
    }
}