let socket = null;
let count;

window.addEventListener('beforeunload', (event) => {

    if (null != socket) {

        socket.disconnect();
        // Cancel the event as stated by the standard.
        event.preventDefault();

        // Chrome requires returnValue to be set.
        event.returnValue = '';
    }

}, false);

window.addEventListener('DOMContentLoaded', () => {
    socket = window.io();
    count = 0;
    socket.on('connect', async function () {
        console.log('connect');
    });

});



