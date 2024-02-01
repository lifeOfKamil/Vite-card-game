import React from "react";
import "../App.css";

function Card(props) {
	const cardStyle = {
		border: "1px solid #4f4f4f",
		borderRadius: "4px",
		backgroundColor: "#fff",
		width: "168px",
		height: "245px",
	};
	return (
		<button style={cardStyle} className="card">
			{`${props.rank} of ${props.suit}`}
		</button>
	);
}

export default Card;
