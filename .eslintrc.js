module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "plugins": [
        "promise"
    ],
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "max-statements": [
            "warn",
            15
        ],
        "complexity": [
            "warn",
            10
        ],
        "promise/param-names": [
            "warn",
        ],
        "promise/catch-or-return": [
            "warn",
            10
        ],
    }
};
