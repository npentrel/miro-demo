require('dotenv-safe').config();

const axios = require('axios');

//////////////////////////////////
// FILL IN THE IDS HERE
//////////////////////////////////
const appConfig = {
    boardId: '<board_id>',
    frameId: '<frame_id>'
}

const TIME = 60;
const COLORS = ["#e27a7a", "#e09d43", "#248fb2", "#6bbd5b", "#4262ff", "#ffbfbf", "#ffd02f", "#3f53d9", "#ff6575"]
const NAMES = [
    "Naomi",
    "Andrew",
    "Ricky",
    "Emily"
]
const ENERGIZERS = [{
        text: "In " + TIME + " seconds, draw an owl with the pen tool. Your time starts now."
    },
    {
        text: "In " + TIME + " seconds, visually tell everyone about your first job."
    },
    {
        text: "In " + TIME + " seconds, write down something new or good that has happened to you this week. Or type in pass."
    },
    {
        text: "In " + TIME + " seconds, draw a telephone with the pen tool. Your time starts now."
    },
    {
        text: "In " + TIME + " seconds, add the best picture of an animal."
    },
    {
        text: "In " + TIME + " seconds, recommend a movie/tv show."
    }
]

class MiroBoardApiService {
    constructor(miroProperties) {
        this._miro = miroProperties;
        this._headers = {
            headers: {
                Authorization: `Bearer ${process.env.MIRO_TOKEN}`,
            },
        };
    }

    async createWidget(widgetData) {



    }

    async getFrameWidget() {
        const response = await axios.get(`https://api.miro.com/v1/boards/${this._miro.boardId}/widgets/${this._miro.frameId}`, this._headers);
        return response.data;
    }

    async updateWidget(widgetData, id) {
        const response = await axios.patch(`https://api.miro.com/v1/boards/${this._miro.boardId}/widgets/${id}`, widgetData, this._headers);
        return response.data;
    }
}

class EnergizerService {
    constructor(energizers, boardApiService, frameWidget) {
        this._energizers = energizers;
        this._boardAPIService = boardApiService;
        this._frame = frameWidget;
    }

    selectEnergizer() {
        let random_int = Math.floor(Math.random() * this._energizers.length);
        // Comment the below line to set a random energizer
        return this._energizers[0];
        return this._energizers[random_int];
    }

    divideBoard(players, colors) {
        let x = this._frame.x;
        let y = this._frame.y;
        let width = this._frame.width;
        let height = this._frame.height;

        let boards = [];
        let dimensionX = Math.ceil(Math.sqrt(players.length));
        let dimensionY = Math.ceil(Math.sqrt(players.length));

        for (let i = 0; i < players.length; i++) {
            boards.push({
                type: "shape",
                text: "<strong>" + players[i] + "</strong>",
                x: x + ((width / dimensionX) * (Math.floor(i / dimensionX))),
                y: y + ((height / dimensionY) * (i % dimensionX)),
                width: width / dimensionX,
                height: height / dimensionY,
                style: {
                    borderColor: colors[i % colors.length],
                    borderWidth: 8,
                    textAlign: "right",
                    textAlignVertical: "bottom",
                    fontSize: 18
                }
            });
        }
        // offset
        if (players.length > 1) {
            for (let i = 0; i < players.length; i++) {
                boards[i].x = boards[i].x - (width / 2) + (width / dimensionX / 2);
                boards[i].y = boards[i].y - (height / 2) + (height / dimensionY / 2);
            }
        }
        return boards;
    }

    setUpBoard(energizer, board) {
        this._boardAPIService.createWidget(board);
        this._boardAPIService.createWidget({
            type: "text",
            text: "<strong>" + energizer.text + "</strong>",
            x: board.x,
            y: board.y,
            width: board.width,
            style: {
                textAlign: "center"
            }
        });
    }

    async addTimeWidgets(boards, time) {
        var widgets = [];
        for (let i = 0; i < boards.length; i++) {
            let widget = boards[i];
            widget.text = "<strong>" + time + "</strong>";
            widget.style = {
                textAlign: "left",
                textAlignVertical: "bottom",
                textColor: "#00FF00",
                fontSize: 18,
                borderOpacity: 0
            };
            let createdWidget = await this._boardAPIService.createWidget(widget);
            delete widget.type;
            widgets.push({ id: createdWidget.id, widget: widget });
        }
        return widgets;
    }

    async updateTimeWidgets(time, widgets) {
        for (let i = 0; i < widgets.length; i++) {
            let widget = widgets[i].widget;
            widget.text = "<strong>" + time + "</strong>";
            if (time <= 15) {
                widget.style.textColor = "#FF0000";
            }
            this._boardAPIService.updateWidget(widget, widgets[i].id);
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async setUpPlayerBoards(energizer, players, time, colors) {
        let playerBoards = this.divideBoard(players, colors);
        for (let i = 0; i < players.length; i++) {
            this.setUpBoard(energizer, playerBoards[i]);
        }

        let time_widgets = await this.addTimeWidgets(playerBoards, time)
        for (let i = 0; i <= time; i++) {
            if (i % 5 == 0) {
                await this.updateTimeWidgets(time - i, time_widgets);
            }
            await this.sleep(1000); // sleep 1 second
        }
    }

}

async function main() {
    const boardApiService = new MiroBoardApiService(appConfig);
    const frame = await boardApiService.getFrameWidget();
    const energizerService = new EnergizerService(ENERGIZERS, boardApiService, frame);
    let energizer = energizerService.selectEnergizer();
    await energizerService.setUpPlayerBoards(energizer, NAMES, TIME, COLORS);
}

main();