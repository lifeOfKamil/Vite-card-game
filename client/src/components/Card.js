function Card(props) {
	return React.createElement("div", { className: "card" }, `${props.rank} of ${props.suit}`);
}

export default Card;
