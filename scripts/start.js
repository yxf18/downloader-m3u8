const { exec } = require("child_process")

spawn_cmd("tsc -w");
spawn_cmd("nodemon dist/index.js");

function spawn_cmd(cmd, avgs) {
    const process = exec(cmd, avgs)

    process.stdout.on("data", data => {
        console.log(data)
    })

    process.on("error", msg => {
        console.log(msg)
    })
}