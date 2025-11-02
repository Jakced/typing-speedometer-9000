"use strict"
/*
Jakob Cederblad
jace2300
jace2300@student.miun.se
*/

//Will hold each text and information about texts.
class CustomText {
    constructor(title, author, language, text) {
        this.title = title;
        this.author = author;
        this.language = language;
        this.text = text;
    }
    getTitle() {
        return this.title;
    }
    getAuthor() {
        return this.author;
    }
    getLanguage() {
        return this.language;
    }
    getText() {
        return this.text;
    }
}

//User input fields
const ingoreCasingCheckbox = document.getElementById("casing-checkbox");
const allowCorrectionCheckbox = document.getElementById("allowcorrection-checkbox");
const textPickerDropdown = document.getElementById('text-dropdown');
const sweLanguageRadioButtons = document.getElementById("lang_swe");
const engLanguageRadioButtons = document.getElementById("lang_eng");

//Other UI elements
const playerTextInput = document.getElementById("text-input");
const playButton = document.getElementById("button-play");
const titleText = document.getElementById("text-title");
const authorText = document.getElementById("text-author");
const textContent = document.getElementById("text-content");

//Statistic UI Elements
const grossWpmLabel = document.getElementById("text-grosswpm");
const netWpmLabel = document.getElementById("text-netwpm");
const accuracyPercentLabel = document.getElementById("text-accuracy");
const errorCountLabel = document.getElementById("text-errors");
const grossWpmGraph = document.getElementById("gross-wpm-graph");

//Interval of the current game; if false then game is not running.
let playInterval = false;
//All custom texts available will be stored in this array.
let customTextArray = [];
//Each letter in a selected text will be stored in this array.
let spanArray = [];
//How many inputs user have typed in current game.
let typedEntries;
//How many errors user have done in current game.
let errorCounterArray = [];

//Whether game will ignore casing or not
let ignoreCasing;
//Wheter game will allow error correction or not
let allowErrorCorrection;

//Audio paths
const SOUND_GAME_START = 'audio/game-start.mp3';
const SOUND_GAME_FINISH = 'audio/game-finish.mp3';
const SOUND_GAME_SPACE = 'audio/key-space.mp3';
const SOUND_GAME_ERROR = 'audio/key-error.mp3';
const SOUND_GAME_CLICK = 'audio/key-click.mp3';

//How many x-valuse shall be registered in WPN graph, default 100.
const wpnGrahpicsValues = 100;
//Stores all inputs for graph for each x value.
let wpnGrahpicsArray;
//Statistic refresh rate in ms
const refreshRate = 500;

//Load XML text from filepath and return XML document.
const loadXMLText = (filePath) =>{
    const url = "./texts.xml";
    fetch(url)
    .then(
        response => response.text() // .json(), .blob(), etc.
    ).then(
        text => {
            const parser = new DOMParser();
            const xmlDocument = parser.parseFromString(text, "text/xml");
            addCustomXMLTexts(xmlDocument);
        }
    );
}

//Add all custom text to array.
const addCustomXMLTexts = (textDocument) => {
    //Iterate through all entries in XML document
    for (let index = 0; index < textDocument.getElementsByTagName("title").length; index++) {
        let newTextTitle = textDocument.getElementsByTagName("title")[index].childNodes[0].nodeValue;
        let newTextAuthor = textDocument.getElementsByTagName("author")[index].childNodes[0].nodeValue;
        let newTextLanguage = textDocument.getElementsByTagName("language")[index].childNodes[0].nodeValue;
        let newTextContent = textDocument.getElementsByTagName("text")[index].childNodes[0].nodeValue;
        customTextArray.push(new CustomText(newTextTitle, newTextAuthor, newTextLanguage, newTextContent));
    }
    //Update dropdown options
    refreshDropdownTextOptions();
}

//Return the word count of input text
const getTextWordCount = (text) => {
    return text.split(" ").length;
}

//Return the text count of input text
const getTextCharacterCount = (text) => {
    return text.length;
}

//Return the selected language (Eng/Swe)
const GetSelectedLanguage = () => {
    return document.querySelector('input[name="language"]:checked').value;
}

//Loop through a dropdown and remove every element.
function removeAllDropdownOptions(element) {
    let i, y = element.options.length - 1;
    for(i = y; i >= 0; i--) {
        element.remove(i);
    }
}

//Refresh all text fields according to selected text.
function onDropdownTextOptionsChange() {
    //Get text by option value in dropdown.
    let customTest = customTextArray[parseInt(textPickerDropdown.value)];
    titleText.innerHTML = customTest.getTitle();
    authorText.innerHTML = customTest.getAuthor() + ` (${getTextCharacterCount(customTest.getText())} words, ${getTextCharacterCount(customTest.getText())} chars)`;
    //Add content to textbox
    addTextContent(customTest.getText());
}

//Will add text to 
const addTextContent = (text) => {
    //Remove the current span array
    spanArray.forEach((element) => {
        element.remove();
    });
    //Make sure span is empty
    spanArray = [];
    
    //Add each letter to the span array.
    text.split('').forEach((char) => {
        let span = document.createElement("span");
        span.style.color = 'white';
        span.innerText = char.toString();
        textContent.append(span);
        spanArray.push(span);
    });
}

//Will refresh Text according dropdown options
const refreshDropdownTextOptions = () => {
    removeAllDropdownOptions(textPickerDropdown); //To not add duplicate texts.
    customTextArray.forEach((element) => {
        if (GetSelectedLanguage() === element.getLanguage()) { //Make sure the correct language is iterated.
            let option = document.createElement('option');
            option.value = customTextArray.indexOf(element).toString();
            option.innerHTML = element.getTitle();
            textPickerDropdown.appendChild(option);
        }
    });
    onDropdownTextOptionsChange(textPickerDropdown); //Refresh options
}

const clickPlayButton = () => {
    //Check if game is running.
    if (!playInterval) {
        startGame();
    } else {
        stopGame();
    }
}

//Toogle user inputs enabled/disabled by true or false.
const toogleUserInputAvailability = (bool) => { 
    let allUserInput = [ingoreCasingCheckbox, allowCorrectionCheckbox, sweLanguageRadioButtons, engLanguageRadioButtons, textPickerDropdown];
    if (bool) {
        allUserInput.forEach((element) => element.disabled = false);
    } else {
        allUserInput.forEach((element) => element.disabled = true);
    }
}

//Will keep statistics during the game
const gameRuningInterval = (currentdate) => {
    //Calculate minutes passed
    let elapsedMin = (new Date().getTime() - currentdate) / 60000;
    let grossWPM = ((typedEntries) / 5) / elapsedMin;
    let netWPM = grossWPM - (errorCounterArray.length / elapsedMin);

    grossWpmLabel.innerHTML = Math.round(grossWPM);
    netWpmLabel.innerHTML = Math.round(netWPM);

    updateWPN(grossWPM);
}

const addListeners = () => {
    playerTextInput.addEventListener('keydown', e => {
        onGameInput(e);
    });
    playButton.addEventListener("click", () => { clickPlayButton();}, false );
    textPickerDropdown.addEventListener("change", () => { onDropdownTextOptionsChange();}, false );
    sweLanguageRadioButtons.addEventListener("change", () => { refreshDropdownTextOptions();}, false );
    engLanguageRadioButtons.addEventListener("change", () => { refreshDropdownTextOptions();}, false );

    playerTextInput.addEventListener("focusin", () => { playerTextInput.placeholder = "";}, false );
    playerTextInput.addEventListener("focusout", () => { playerTextInput.placeholder = "Type here...";}, false );
}

const setHighlightText = (index) => {
    spanArray[index].style.background = 'gray';
}

const setRedText = (index) => {
    spanArray[index].style.color = 'red';
}

const setGrayText = (index) => {
    spanArray[index].style.color = 'gray';
}

const startGame = () => {
    //Player should not be able to change any settings while game is runing.
    toogleUserInputAvailability(false);
    //Clear previous game if applicable
    resetGameInput();

    ignoreCasing = ingoreCasingCheckbox.checked;
    allowErrorCorrection = allowCorrectionCheckbox.checked;
    wpnGrahpicsArray = Array(wpnGrahpicsValues).fill(0)
    updateWPN(0);

    //Make sure to focus on input field in order for user to start typing instantly.
    playerTextInput.focus(); 

    playInterval = setInterval(gameRuningInterval, refreshRate, new Date().getTime()); 
    setHighlightText(typedEntries); //Will highlight first word in the text when game start.
    
    playButton.src="./img/stop.png";
    playSound(SOUND_GAME_START);

    accuracyPercentLabel.innerHTML = getAccuracy() + "%";
}

const stopGame = () => {
    playerTextInput.value = ""; //Make sure input field is empty.
    toogleUserInputAvailability(true);
    clearInterval(playInterval);
    playInterval = false;
    playButton.src="./img/play.png";
    playSound(SOUND_GAME_FINISH);
}

const resetGameInput = () => {
    playerTextInput.value = ""; //Make sure input field is empty.
    typedEntries = 0;
    errorCounterArray = [];
    errorCountLabel.innerHTML = errorCounterArray.length;
    spanArray.forEach(element => {
        element.style.background = "none";
        element.style.color = 'white';
    });
}

const playSound = (clip) => {
    new Audio(clip).play();     
}

const onGameInput = (e) => {
    //Game not running
    if (playInterval == false) {
        if (e.key == "Enter") {
            startGame();
        }
        return;
    } else {
        if (e.key == "Escape") {
            stopGame();
            return;
        }
    }
    if (e.key === "Backspace") {
        if (allowErrorCorrection) {
            if (typedEntries > 0) {
                spanArray[typedEntries].style.background = "none"; 
                typedEntries --;
                if (spanArray[typedEntries].style.color === 'red') {
                    //Is this an error previously made?
                    let index = errorCounterArray.indexOf(typedEntries);
                    //Remove from array if exist.
                    if (index !== -1) {
                        errorCounterArray.splice(index, 1);
                    }
                    errorCountLabel.innerHTML = errorCounterArray.length;
                    accuracyPercentLabel.innerHTML = getAccuracy() + "%";
                }
                spanArray[typedEntries].style.color = 'white';
                setHighlightText(typedEntries);
                playSound(SOUND_GAME_SPACE);
            }
            return;    
        } else {
            e.preventDefault();
            return;
        }
    }
    
    //Will ignore input from enter, shift, capslock etc.
    if (e.which < 32 || (e.which > 32 && e.which < 48) || (e.which > 90 && e.which < 96) || (e.which > 111 && e.which < 186)) {
        return;
    }

    //Get last input character
    let lastInputChar = e.key;
    let expectedChar = spanArray[typedEntries].innerText;

    if (ignoreCasing) {
        lastInputChar = lastInputChar.toLowerCase();
        expectedChar = expectedChar.toLowerCase();
    }

    //Check if correct input was made
    if (lastInputChar === expectedChar) {
        //Correct input
        setGrayText(typedEntries);
        playSound(SOUND_GAME_CLICK);
    } else {
        //Incorrect input add index to counter array
        if (!errorCounterArray.includes(typedEntries)) {
            errorCounterArray.push(typedEntries); 
        }
        errorCountLabel.innerHTML = errorCounterArray.length;
        setRedText(typedEntries);
        playSound(SOUND_GAME_ERROR);
    }

    //Pressing space should empty input field
    if (e.code === "Space") {
        playerTextInput.value = "";
    }

    //Increase index of where player is in the text
    typedEntries++;
    accuracyPercentLabel.innerHTML = getAccuracy() + "%";

    //Remove pointer highlighter from last index
    if (typedEntries > 0) {
        if (spanArray[typedEntries - 1].style.background.value != 'red') {
            spanArray[typedEntries - 1].style.background = "none";   
        }
    }

    //If there is no more text stop the game
    if (typedEntries >= spanArray.length) {
        stopGame();
    } else {
        setHighlightText(typedEntries);
    }
}

//Get current accuracy 
const getAccuracy = () => {
    if (typedEntries > 0) {
        return Math.round((1 - (errorCounterArray.length / typedEntries)) * 100);
    } else {
        return 0;
    }
}

//TODO fix so standard lines doesn't get updated everytime.
//Push a new entry for WPN Graph, will delete the oldest entry and push in a new at the beginning.
const updateWPN = (newWPN) => {
    wpnGrahpicsArray.shift();
    wpnGrahpicsArray.push(newWPN);
    updateStatisticGraphics();
}

const updateStatisticGraphics = () => {
    let ctx = grossWpmGraph.getContext("2d");
    ctx.reset();
    drawCanvasStatisticLines();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, grossWpmGraph.height - wpnGrahpicsArray[0]); 
    ctx.strokeStyle = 'yellow';
    for (let index = 1; index < wpnGrahpicsArray.length; index++) {
        ctx.lineTo(grossWpmGraph.width / (wpnGrahpicsArray.length - 1) * index, (grossWpmGraph.height - wpnGrahpicsArray[index]));
    }
    ctx.stroke();
    ctx.save();
}

const drawCanvasStatisticLines = () => {
    let staticCtx = grossWpmGraph.getContext("2d");
    staticCtx.beginPath();
    staticCtx.strokeStyle = 'white';
    staticCtx.lineWidth = 2;
    for (let index = 1; index < 5; index++) {
        staticCtx.moveTo(0, grossWpmGraph.height / 5 * index); 
        staticCtx.lineTo(grossWpmGraph.width, grossWpmGraph.height / 5 * index);
    }
    staticCtx.stroke();
    staticCtx.save();
}

const initPage = () => {
    loadXMLText();
    addListeners();
    drawCanvasStatisticLines();
}

window.addEventListener("load", initPage, false );