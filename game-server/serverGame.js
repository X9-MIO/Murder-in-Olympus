const dbFns = require("./databaseFunction");
const { runtimeRooms, getAlivePlayers, buildRoleList, buildVoteCount } = require("./serverState");
const { startNightPhase, endVotingPhase } = require("./serverGamePhases");

function setupGameEvents(io, socket) {

    socket.on("start-game", (roomCode) => {
        const room = dbFns.getRoom(roomCode);
        if (!room || room.creator_socket_id !== socket.id) return;

        const players = dbFns.getPlayers(roomCode);
        const roleConfig = runtimeRooms[roomCode].roleConfig; 
        const roles = buildRoleList(players.length, roleConfig);

        const order = [...players].sort(() => Math.random() - 0.5);
        order.forEach((player, idx) => {
            const role = roles[idx];
            dbFns.assignRole(player.socket_id, role);
            io.to(player.socket_id).emit("receive-role", role);
        });

        dbFns.updateRoomPhase(roomCode, "starting");
        io.to(roomCode).emit("game-starting");

        setTimeout(() => { startNightPhase(io, roomCode); }, 17000);
    });

    socket.on("cast-vote", (roomCode, targetPlayerName) => {
        const room = dbFns.getRoom(roomCode);
        if (!room || room.game_phase !== "discussion") return;

        const player = dbFns.getPlayerBySocket(socket.id);
        if (!player || player.eliminated) return;

        dbFns.saveVote(roomCode, socket.id, targetPlayerName);
        const votes = dbFns.getVotes(roomCode);
        const voteCount = buildVoteCount(votes);

        io.to(roomCode).emit("live-vote-update", voteCount);

        const alivePlayers = getAlivePlayers(roomCode);
        if (votes.length >= alivePlayers.length) {
            if (runtimeRooms[roomCode]?.discussionTimer) {
                clearTimeout(runtimeRooms[roomCode].discussionTimer);
                runtimeRooms[roomCode].discussionTimer = null;
            }
            endVotingPhase(io, roomCode);
        }
    });

    socket.on("submit-night-action", (roomCode, actionData) => {
        const room = dbFns.getRoom(roomCode);
        if (!room || room.game_phase !== "night") return;

        const player = dbFns.getPlayerBySocket(socket.id);
        if (!player || player.eliminated) return;

        if (actionData.type === "seer-inspect" && player.role === "Seer") {
            if (player.inspections_left <= 0) {
                return io.to(socket.id).emit("receive-message", "Your visions have faded. No inspections left.");
            }

            const target = getAlivePlayers(roomCode).find((p) => p.display_name === actionData.target);

            let feedback = "Innocent";
            if (target && target.role === "Wolf") {
                feedback = "Dangerous";
            }

            dbFns.useInspection(socket.id); 

            io.to(socket.id).emit("seer-result", { 
                target: actionData.target, 
                role: feedback 
            });
        }

        dbFns.saveNightAction(roomCode, socket.id, player.display_name, player.role, actionData.type, actionData.target || null);

        if (actionData.type === "little-girl-peek" && player.role === "Little Girl") {
            const currentWolves = getAlivePlayers(roomCode).filter(p => p.role === "Wolf");
            const wolfNames = currentWolves.map(p => p.display_name);
            io.to(socket.id).emit("little-girl-result", { wolves: wolfNames });

            if (Math.random() < 0.70) {
                currentWolves.forEach(w => {
                    io.to(w.socket_id).emit("little-girl-caught", { littleGirlName: player.display_name });
                });
            }
        }
    });
}

module.exports = { setupGameEvents };