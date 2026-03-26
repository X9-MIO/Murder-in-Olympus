import { appendToGameChat } from './GameUtils.js';

export function setupRoleLogic(socket, gameState) {
    socket.on('receive-role', (role) => {
        gameState.myRole = role; 
        const cardRoleText = document.getElementById("card-role-text");
        
        if (cardRoleText) {
            cardRoleText.textContent = role;
            
            const roleColors = {
                "Wolf": "#ef4444",
                "Seer": "#a855f7",
                "Healer": "#22c55e",
                "Little Girl": "#ec4899",
                "Artemis": "#eab308"
            };
            cardRoleText.style.color = roleColors[role] || "var(--accent)"; 
        }

        const roleImage = document.getElementById("role-image");
        const messagingRoleImage = document.getElementById("messaging-role-image");
        
        const imagePath = `/public/${role.toLowerCase().replace(' ', '-')}.png`;
        const fallbackPath = "/public/villager.png";

        if (roleImage) roleImage.src = role !== "Villager" ? imagePath : fallbackPath; 
        if (messagingRoleImage) messagingRoleImage.src = role !== "Villager" ? imagePath : fallbackPath;
    });

    socket.on('seer-result', (data) => {
    appendToGameChat(`Your vision clears... ${data.target} appears to be ${data.role}.`);
    
    document.querySelectorAll('.night-target-btn').forEach(btn => {
        if (btn.textContent === "Revealing...") {
            btn.textContent = `${data.target}: ${data.role}`;
            btn.style.background = data.role === 'Dangerous' ? '#ef4444' : '#a855f7';
            btn.style.color = '#fff';
        }
    });
});

    socket.on('little-girl-result', (data) => {
        const wolvesList = data.wolves.length > 0 ? data.wolves.join(", ") : "Nobody";
        appendToGameChat(`You peeked through your fingers and saw the wolves: ${wolvesList}`);
        
        document.querySelectorAll('.night-target-btn').forEach(btn => {
            if (btn.textContent === "Revealing...") {
                btn.textContent = `The Wolf is: ${wolvesList}!`;
                btn.style.background = '#ef4444'; 
                btn.style.color = '#fff';
            }
        });
    });

    socket.on('little-girl-caught', (data) => {
        appendToGameChat(`Watch out! ${data.littleGirlName} is the Little Girl and she just caught you moving!`);
        
        document.querySelectorAll('.night-target-btn').forEach(btn => {
            if (btn.textContent === data.littleGirlName) {
                btn.textContent = `${data.littleGirlName} (Caught Peeking!)`;
                btn.style.background = '#ec2424'; 
                btn.style.color = '#fff';
                btn.style.borderColor = '#fff';
                btn.style.fontWeight = 'bold';
            }
        });
    });

    const createModal = (id, titleText, messageText, color, btnText) => {
        const modal = document.createElement('div');
        modal.id = id;
        modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 2000;`;
        
        const content = document.createElement('div');
        content.style.cssText = `background: var(--bg); padding: 40px; border-radius: 15px; text-align: center; max-width: 400px; box-shadow: 0 10px 30px ${color}80; border: 3px solid ${color};`;
        
        const title = document.createElement('h2');
        title.textContent = titleText;
        title.style.color = color;
        
        const msg = document.createElement('p');
        msg.style.cssText = 'font-size: 1.3rem; margin: 20px 0;';
        msg.textContent = messageText;

        const btn = document.createElement('button');
        btn.textContent = btnText;
        btn.style.cssText = `padding: 10px 20px; background: ${color}; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 1.1rem;`;
        btn.onclick = () => modal.remove();

        content.append(title, msg, btn);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        return modal;
    };

    socket.on('you-were-saved', () => {
        appendToGameChat(`A glowing light protected you from the wolves. The Healer saved your life!`);
        const modal = createModal('savedModal', 'Protected!', 'The Healer visited you in the night. You survived the beast attack.', '#3789f5', 'Thank the Gods');
        setTimeout(() => modal.remove(), 7000);
    });

    socket.on('you-turned-wolf', () => {
        gameState.myRole = "Wolf";
        const cardRoleText = document.getElementById("card-role-text");
        if (cardRoleText) {
            cardRoleText.textContent = "Wolf";
            cardRoleText.style.color = "#ef4444"; 
        }
        
        document.getElementById("role-image").src = "/public/wolf.png"; 
        document.getElementById("messaging-role-image").src = "/public/wolf.png";

        appendToGameChat(`You were bitten in the night! You are now a Werewolf. Your new goal is to destroy the village.`);
        const modal = createModal('infectedModal', 'Bitten!', 'You have transformed into a Werewolf! Turn against your former friends and eliminate the village.', '#ef4444', 'Accept your fate');
        setTimeout(() => modal.remove(), 8000);
    });
}