import React from "react";
import "../App.css"; // Import CSS for styling the popup

const Popup = ({ message, onClose }) => {
	return (
		<div className="popup-overlay">
			<div className="popup-content">
				<p>{message}</p>
				<button onClick={onClose}>Close</button>
			</div>
		</div>
	);
};

export default Popup;
