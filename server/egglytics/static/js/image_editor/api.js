//
// 
// 
// FOR SERVER COMMUNICATION
// 
// 
//

/**
 * Server Communication Module
 * ---------------------------
 * Provides helper functions for sending annotation updates
 * from the client interface to the backend server.
 *
 * Responsibilities:
 * - Send newly created annotations to the server
 * - Remove existing annotations from the database
 * - Save grid toggle states
 * - Attach CSRF authentication tokens to requests
 * - Handle network failures gracefully
 *
 * This module acts as the communication layer between the
 * front-end annotation interface and the backend database.
 *
 * Annotation Types Supported:
 * - Point annotations (single coordinate markers)
 * - Rectangle annotations (bounding box regions)
 * - Grid interaction states
 *
 * Security:
 * All requests include a CSRF token extracted from browser
 * cookies to comply with server-side security protections.
 *
 * Workflow:
 * User Interaction → Annotation Action → API Request → Server Update
 *
 * If the server request fails, functions return a failure state
 * so the application can decide whether to retry, cache locally,
 * or notify the user.
 */


/**
 * Retrieves the CSRF token stored in browser cookies.
 *
 * Purpose:
 * Ensures that POST requests sent to the backend comply with
 * CSRF protection implemented on the server.
 *
 * Returns:
 * - CSRF token string if present
 * - Empty string if token cannot be found
 */

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


/**
 * Sends a newly created point annotation to the server.
 *
 * Purpose:
 * When a user marks a mosquito egg using a point marker,
 * this function transmits the image identifier and the
 * annotation coordinates to the backend database.
 *
 * Request Type:
 * POST
 *
 * Parameters:
 * - Image identifier
 * - X coordinate
 * - Y coordinate
 *
 * Returns:
 * - true if the server confirms the annotation was stored
 * - false if the request fails
 *
 * Failure Handling:
 * If the server cannot be reached, the function reports
 * the failure so the application can optionally store
 * the annotation locally or retry later.
 */

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

/**
 * Removes an existing point annotation from the server.
 *
 * Purpose:
 * When a point marker is deleted from the interface,
 * this function ensures the corresponding record
 * is removed from the backend database.
 *
 * Request Type:
 * POST
 *
 * Parameters:
 * - Image identifier
 * - X coordinate
 * - Y coordinate
 *
 * Returns:
 * - true if the server confirms deletion
 * - false if the request fails
 */
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

/**
 * Sends a rectangle annotation (bounding box) to the server.
 *
 * Purpose:
 * Rectangle annotations represent detected or manually
 * labeled mosquito eggs using bounding box regions.
 * This function stores the rectangle coordinates in
 * the backend database.
 *
 * Request Type:
 * POST
 *
 * Parameters:
 * - Image identifier
 * - Rectangle corner coordinates
 *
 * Returns:
 * - true if the server confirms storage
 * - false if the request fails
 *
 * Failure Handling:
 * If the request fails due to connectivity issues,
 * the function returns a failure state so the
 * application may retry or store the annotation locally.
 */

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


/**
 * Removes a rectangle annotation from the server.
 *
 * Purpose:
 * When a bounding box annotation is deleted from the UI,
 * this function ensures the corresponding rectangle entry
 * is removed from the backend database.
 *
 * Request Type:
 * POST
 *
 * Parameters:
 * - Image identifier
 * - Rectangle corner coordinates
 *
 * Returns:
 * - true if the server confirms deletion
 * - false if the request fails
 */

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

/**
 * Saves grid interaction state to the server.
 *
 * Purpose:
 * The annotation interface may allow users to toggle
 * grid cells or mark grid positions for assistance
 * during annotation. This function records those
 * interactions in the backend database.
 *
 * Request Type:
 * POST
 *
 * Parameters:
 * - Image identifier
 * - Grid X position
 * - Grid Y position
 *
 * Returns:
 * - true if the server confirms the update
 * - false if the request fails
 *
 * Failure Handling:
 * If the request fails, the application can retry
 * or manage the grid state locally until the
 * server becomes available.
 */
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