# Sri Lanka Tourism Guide Mobile App

This is the mobile app for the Sri Lanka Tourism Guide project. It allows tourists to explore Sri Lanka, find interesting places, and plan their trips.

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
```
git clone [repository-url]
cd tourism-guide/mobile
```

2. Install dependencies
```
npm install
# or
yarn install
```

3. Environment Setup

The app uses environment variables for configuration. Create a copy of the `env.example.js` file and name it `env.js`:

```
cp env.example.js env.js
```

Edit the `env.js` file to include your API keys and other configuration:

```javascript
const ENV = {
  dev: {
    apiUrl: "http://localhost:5000/api",
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    enableAnalytics: false,
    debugMode: true
  },
  // other environments...
};
```

**Note:** The `env.js` file is excluded from Git in `.gitignore` to prevent sensitive information from being committed.

#### Required API Keys

- **Google Maps API Key**: Used for map features and Places API
  - Must have the following APIs enabled:
    - Maps SDK for Android/iOS
    - Places API
    - Geocoding API
    - Directions API

### Running the App

```
expo start
# or
npm start
# or
yarn start
```

## Features

- **Maps**: Explore Sri Lanka with interactive maps
- **Search**: Find attractions, restaurants, and more
- **Google Places Integration**: Access millions of places from Google Maps
- **Itinerary Planning**: Create and manage your travel itinerary
- **Reviews**: Read and write reviews for places you visit
- **Offline Mode**: Access essential features even without internet connection

## Project Structure

- `src/`: Main source code
  - `components/`: Reusable UI components
  - `screens/`: App screens
  - `services/`: API services and data handling
  - `store/`: Redux store and slices
  - `utils/`: Utility functions and constants
- `assets/`: Static assets like images and fonts
- `env.js`: Environment variables (not committed to Git)

## Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 