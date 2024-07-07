<br/>
<p align="center">
  <a href="https://github.com/lifeOfKamil/Vite-card-game">
    <img src="haan_logo.png" alt="Logo" width="150" height="150">
  </a>

  <h2 align="center">Haan Card Game</h2>

  <p align="center">
    Experience the excitement of my favorite café card game with friends online, brought to life using Vite, React, and Socket.io. 
    <br/>
    <br/>
    <a href="https://github.com/lifeOfKamil/Vite-card-game"><strong>Explore the docs »</strong></a>
    <br/>
    <br/>
    <a href="https://github.com/lifeOfKamil/Vite-card-game">View Demo</a>
    .
    <a href="https://github.com/lifeOfKamil/Vite-card-game/issues">Report Bug</a>
    .
    <a href="https://github.com/lifeOfKamil/Vite-card-game/issues">Request Feature</a>
  </p>
</p>

## Table Of Contents

- [About the Project](#about-the-project)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Authors](#authors)
- [Acknowledgements](#acknowledgements)

## About The Project

<img src="oneplus_nighttime.png" alt="sunrise_mockup" width="1000">

Hi there! I'm Kamil Lepkowski, a passionate developer who created this real-time card game web application, inspired by a card game I often played with friends at a local cafe. 

I wanted to bring the fun and excitement of our favorite card game into the digital world, allowing players to connect and play together alone. Built with Vite, React, and Socket.io, this app provides a seamless gaming experience replicating the dynamic nature of our in-person games. 

Whether you're looking to reminisce about old times or discover a new favorite card game, Haan is a great way to enjoy time with your friends.

### Game Rules

Although I have been unable to trace the exact roots of this game, we have always called it 'Haan'. The objective of the game is to get rid of all the cards in your hand. During normal play, the player must place a card which is equal or higher than the current card. 

A player must pick-up cards from the deck to maintain the same amount of cards in hand. Once the deck is empty and the player has no cards in hand, the player will pick-up the face up cards. Once the player gets rid of those cards, they must flip the face down cards when it is their turn as a 'gamble'. The last stage of the game brings a lot of excitement depending on whether or not luck is in your favor.

The special cards consist of a 2, 7, and 10. The 2 and 10 can be played at any point in the game while the 7 must be played sequentially (i.e., can be played on a 7 or lower). The 2 is a wildcard which requires another card to be played with it. The 10 is also a wildcard that clears the deck. 

## Built With

- [Vite](https://vitejs.dev/) - Google's UI toolkit for building natively compiled applications.
- [React](https://react.dev/) - Programming language optimized for building mobile, desktop, server, and web applications.
- [Socket.IO](https://socket.io/) - API for accessing real-time weather data.
- [Express.js](https://expressjs.com/) - API for accessing real-time weather data.

## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites

Ensure you have the following installed:

- Node.js (v14 or higher)
- npm (v6 or higher) or yarn (v1.22 or higher)

### Installation

1. Clone the Repository

```sh
    git clone https://github.com/lifeOfKamil/Vite-card-game.git
```

2. Navigate to the Project Directory

```sh
    cd your-repo
```

3. Install Dependencies

```sh
    npm install
```

4. Start Development Server

Navigate to the client-side project directory

```sh
	npm run dev
```

5. Start the Socket.io Server

Open another terminal window and navigate to the server-side project directory

```sh
    npm run server
```

6. Open the App in Your Browser

Navigate to `http://localhost:3000` in your web browser to start using the app.

Feel free to reach out if you encounter any issues or have questions.

## Usage

Here are some additional screenshots and mockup:

<img src="iphone_x_gradient_daytime.jpg" alt="daytime_mockup" width="1000">
<br></br>
<img src="three_iphone_mockup.jpg" alt="three_iphone_mockup" width="1000">
<br></br>
<img src="iphone_xs_sunrise.png" alt="sunrise_mockup" width="1000">

## Roadmap

See the [open issues](https://github.com/lifeOfKamil/Vite-card-game/issues) for a list of proposed features (and known issues).

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

- If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/lifeOfKamil/Vite-card-game/issues) to discuss it, or directly create a pull request after you edit the _README.md_ file with necessary changes.
- Please make sure you check your spelling and grammar.
- Create individual PR for each suggestion.
- Please also read through the [Code Of Conduct](https://github.com/lifeOfKamil/Flutter-Weather-App/blob/main/CODE_OF_CONDUCT.md) before posting your first idea as well.

### Creating A Pull Request

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewFeature`)
3. Commit your Changes (`git commit -m 'Add some NewFeature'`)
4. Push to the Branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [LICENSE](https://github.com/lifeOfKamil/Flutter-Weather-App/blob/main/LICENSE.md) for more information.

## Authors

- **Kamil Lepkowski** - _Computer Science Student_ - [Kamil Lepkowski](https://github.com/lifeOfKamil) - _Designed and built the card game_

## Acknowledgements

I would like to express my gratitude to the following:

- **Vite:**
  For providing an incredibly fast development environment and build tool that made setting up and optimizing the project seamless.

- **React:**
  For enabling a responsive and dynamic user interface, making the user experience smooth and engaging.

- **Socket.io:**
  For facilitating real-time communication between clients and the server, allowing for an interactive and synchronous gameplay experience.

If you made it this far, thank you again for checking out my app!
