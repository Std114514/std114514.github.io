class NameArena {
    constructor() {
        this.characters = [];
        this.teams = [];
        this.battleLog = [];
        this.isFighting = false;
        this.currentSpeed = 200;
        this.round = 0;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startBattle());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearInput());
        document.getElementById('exampleBtn').addEventListener('click', () => this.loadExample());
        
        // 速度控制
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSpeed = parseInt(e.target.dataset.speed);
            });
        });
    }
    
    // 哈希函数1
    hash1(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 2337 + (str.charCodeAt(i) - 32) * 3868 + 1759) % 1000000;
        }
        return hash;
    }
    
    // 哈希函数2
    hash2(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 9571 + (str.charCodeAt(i) - 32) * 8683 + 7332) % 1000000;
        }
        return hash;
    }
    
    // 防御判定
    defenseCheck(defense) {
        const rand = Math.floor(Math.random() * 150) + 1;
        if (rand <= defense / 4) return 2; // 反弹
        else if (rand <= defense) return 1; // 防御成功
        else return 0; // 防御失败
    }
    
    // 修复后的 parseNames 函数
    parseNames(input) {
        const lines = input.split('\n');
        const teams = [];
        let currentTeam = [];
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                // 遇到空行，如果当前队伍有内容，就保存当前队伍
                if (currentTeam.length > 0) {
                    teams.push([...currentTeam]);
                    currentTeam = [];
                }
            } else {
                // 非空行，添加到当前队伍
                currentTeam.push(trimmedLine);
            }
        });
        
        // 处理最后一个队伍
        if (currentTeam.length > 0) {
            teams.push([...currentTeam]);
        }
        
        return teams;
    }
    
    // 初始化角色
    initializeCharacters(teams) {
        this.characters = [];
        let id = 1;
        
        teams.forEach((team, teamIndex) => {
            team.forEach(name => {
                const hash1 = this.hash1(name);
                const hash2 = this.hash2(name);
                
                // 将哈希值分解为数字数组
                const x = [];
                let temp = hash1;
                for (let i = 0; i < 6; i++) {
                    x.push(temp % 10);
                    temp = Math.floor(temp / 10);
                }
                
                const m = [];
                temp = hash2;
                for (let i = 0; i < 6; i++) {
                    m.push(temp % 10);
                    temp = Math.floor(temp / 10);
                }
                
                // 计算属性
                const maxHp = 350 + x[1] * x[4] + 2 * x[3] * x[6];
                const attack = 15 + x[2] + x[5];
                const critical = (5 + m[3] % 8) * 5;
                const defense = (5 + m[5]) * 3;
                const magic = (m[1] % 6 + m[6] % 6 + m[2] % 6) * 3;
                
                this.characters.push({
                    id: id++,
                    name: name,
                    team: teamIndex + 1,
                    maxHp: maxHp,
                    currentHp: maxHp,
                    attack: attack,
                    critical: critical,
                    defense: defense,
                    magic: magic,
                    isAlive: true,
                    isCharging: false,
                    isBurning: false,
                    burnDamage: 0,
                    isCriticalHealth: false
                });
            });
        });
    }
    
    // 开始战斗
    async startBattle() {
        const input = document.getElementById('nameInput').value.trim();
        if (!input) {
            this.addLog('请输入名字！', 'log-warning');
            return;
        }
        
        const teams = this.parseNames(input);
        if (teams.length < 2 || teams.flat().length < 2) {
            this.addLog('至少需要2个队伍且每个队伍至少1人！', 'log-warning');
            return;
        }
        
        this.isFighting = true;
        this.round = 0;
        this.battleLog = [];
        document.getElementById('battleLog').innerHTML = '';
        
        this.initializeCharacters(teams);
        this.displayCharacterStats();
        
        this.addLog('战斗开始！', 'log-special');
        await this.delay(1000);
        
        await this.fight();
    }
    
    // 战斗主循环
    async fight() {
        let lastAttacker = null;
        
        while (this.isFighting) {
            this.round++;
            
            // 检查是否只有一队存活
            const aliveTeams = new Set();
            this.characters.forEach(char => {
                if (char.isAlive) {
                    aliveTeams.add(char.team);
                }
            });
            
            if (aliveTeams.size <= 1) {
                this.endBattle();
                break;
            }
            
            // 选择攻击者
            let attacker = this.selectRandomAliveCharacter();
            while (attacker === lastAttacker) {
                attacker = this.selectRandomAliveCharacter();
            }
            lastAttacker = attacker;
            
            this.addLog(`第 ${this.round} 回合`, 'log-normal');
            this.addLog(`现在是 ${attacker.name} 的回合！`, 'log-special');
            
            await this.performAction(attacker);
            await this.delay(this.currentSpeed);
            
            // 处理燃烧伤害
            await this.processBurnDamage();
            await this.delay(this.currentSpeed);
            
            // 检查濒死状态
            this.checkCriticalHealth();
            
            // 更新显示
            this.displayCharacterStats();
            
            await this.delay(this.currentSpeed);
        }
    }
    
    // 选择随机存活的角色
    selectRandomAliveCharacter() {
        const aliveChars = this.characters.filter(char => char.isAlive);
        return aliveChars[Math.floor(Math.random() * aliveChars.length)];
    }
    
    // 执行行动
    async performAction(attacker) {
        const rand = Math.floor(Math.random() * 200) + 1;
        
        if (rand <= attacker.magic) {
            // 使用魔法
            await this.useMagic(attacker);
        } else if (rand <= attacker.magic + attacker.critical) {
            // 暴击
            await this.criticalAttack(attacker);
        } else {
            // 普通攻击
            await this.normalAttack(attacker);
        }
    }
    
    // 普通攻击
    async normalAttack(attacker) {
        const target = this.selectRandomEnemy(attacker);
        const damage = attacker.attack - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 攻击 ${target.name}，造成 ${damage} 点伤害`, 'log-attack');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 暴击攻击
    async criticalAttack(attacker) {
        const target = this.selectRandomEnemy(attacker);
        const damage = Math.floor(attacker.attack * 2.5) - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 暴击！对 ${target.name} 造成 ${damage} 点伤害`, 'log-critical');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 使用魔法
    async useMagic(attacker) {
        const magicType = Math.floor(Math.random() * 9);
        
        switch (magicType) {
            case 0: // 治疗
                await this.healMagic(attacker);
                break;
            case 1: // 重创
                await this.heavyStrike(attacker);
                break;
            case 2: // 冰冻术
                await this.freezeMagic(attacker);
                break;
            case 3: // 属性提升
                await this.buffMagic(attacker);
                break;
            case 4: // 原子弹
                await this.nukeMagic(attacker);
                break;
            case 5: // 雷劈术
                await this.thunderMagic(attacker);
                break;
            case 6: // 蓄力攻击
                await this.chargeAttack(attacker);
                break;
            case 7: // 火球术
                await this.fireballMagic(attacker);
                break;
            case 8: // 复活
                await this.resurrectMagic(attacker);
                break;
        }
    }
    
    // 治疗魔法
    async healMagic(attacker) {
        const ally = this.selectRandomAlly(attacker);
        const heal = Math.floor(ally.maxHp / 5) - 3 + Math.floor(Math.random() * 7);
        
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
        this.addLog(`${attacker.name} 治疗 ${ally.name}，回复 ${heal} 点HP`, 'log-heal');
    }
    
    // 重创魔法
    async heavyStrike(attacker) {
        const target = this.selectRandomEnemy(attacker);
        const damage = attacker.attack * 5 - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 重创 ${target.name}，造成 ${damage} 点伤害`, 'log-attack');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 冰冻术
    async freezeMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        
        target.attack = Math.floor(target.attack * 0.67);
        target.defense = Math.floor(target.defense * 0.67);
        target.magic = Math.floor(target.magic * 0.67);
        
        this.addLog(`${attacker.name} 使用冰冻术，${target.name} 属性全面降低`, 'log-magic');
    }
    
    // 属性提升
    async buffMagic(attacker) {
        attacker.attack = Math.floor(attacker.attack * 1.5);
        attacker.defense = Math.min(120, Math.floor(attacker.defense * 1.5));
        attacker.magic = Math.min(80, Math.floor(attacker.magic * 1.5));
        
        this.addLog(`${attacker.name} 属性全面提升`, 'log-magic');
    }
    
    // 原子弹
    async nukeMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        
        target.currentHp = Math.floor(target.currentHp / 2);
        this.addLog(`${attacker.name} 扔出原子弹，${target.name} 的HP减少一半`, 'log-special');
        
        if (target.isCharging) {
            target.isCharging = false;
            this.addLog(`${target.name} 的蓄力被打断`, 'log-warning');
        }
        
        this.checkDeath(target);
    }
    
    // 雷劈术
    async thunderMagic(attacker) {
        const damage = Math.floor(attacker.attack * 0.67) - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 使用雷劈术，对所有敌人造成 ${damage} 点伤害`, 'log-magic');
        
        this.characters.forEach(char => {
            if (char.isAlive && char.team !== attacker.team) {
                char.currentHp -= damage;
                if (char.isCharging) {
                    char.isCharging = false;
                    this.addLog(`${char.name} 的蓄力被打断`, 'log-warning');
                }
                this.checkDeath(char);
            }
        });
    }
    
    // 蓄力攻击
    async chargeAttack(attacker) {
        if (!attacker.isCharging) {
            attacker.isCharging = true;
            this.addLog(`${attacker.name} 正在蓄力...`, 'log-special');
        } else {
            attacker.isCharging = false;
            const target = this.selectRandomEnemy(attacker);
            const damage = attacker.attack * 24 - 3 + Math.floor(Math.random() * 7);
            
            this.addLog(`${attacker.name} 蓄力完成！对 ${target.name} 造成 ${damage} 点无法抵挡的伤害`, 'log-critical');
            
            target.currentHp -= damage;
            if (target.isCharging) {
                target.isCharging = false;
                this.addLog(`${target.name} 的蓄力被打断`, 'log-warning');
            }
            this.checkDeath(target);
        }
    }
    
    // 火球术
    async fireballMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        const damage = Math.floor(attacker.attack * 0.67) - 3 + Math.floor(Math.random() * 7);
        
        target.isBurning = true;
        target.burnDamage = damage;
        target.currentHp -= damage;
        
        this.addLog(`${attacker.name} 对 ${target.name} 扔出火球，造成 ${damage} 点伤害并点燃`, 'log-attack');
        
        if (target.isCharging) {
            target.isCharging = false;
            this.addLog(`${target.name} 的蓄力被打断`, 'log-warning');
        }
        this.checkDeath(target);
    }
    
    // 复活魔法
    async resurrectMagic(attacker) {
        const deadAllies = this.characters.filter(char => 
            !char.isAlive && char.team === attacker.team
        );
        
        if (deadAllies.length > 0) {
            const target = deadAllies[Math.floor(Math.random() * deadAllies.length)];
            target.isAlive = true;
            target.currentHp = Math.floor(target.maxHp / 5);
            target.isCharging = false;
            target.isBurning = false;
            target.isCriticalHealth = false;
            
            this.addLog(`${attacker.name} 复活了 ${target.name}`, 'log-heal');
        } else {
            this.addLog(`${attacker.name} 试图复活队友，但没有目标`, 'log-warning');
        }
    }
    
    // 选择随机敌人
    selectRandomEnemy(attacker) {
        const enemies = this.characters.filter(char => 
            char.isAlive && char.team !== attacker.team
        );
        return enemies[Math.floor(Math.random() * enemies.length)];
    }
    
    // 选择随机队友
    selectRandomAlly(attacker) {
        const allies = this.characters.filter(char => 
            char.isAlive && char.team === attacker.team && char.id !== attacker.id
        );
        return allies.length > 0 ? 
            allies[Math.floor(Math.random() * allies.length)] : attacker;
    }
    
    // 应用伤害（包含防御判定）
    async applyDamage(target, damage, attacker) {
        const defenseResult = this.defenseCheck(target.defense);
        
        switch (defenseResult) {
            case 1: // 防御成功
                this.addLog(`${target.name} 防御成功`, 'log-defend');
                break;
            case 2: // 反弹
                this.addLog(`${target.name} 反弹伤害`, 'log-defend');
                const reboundResult = this.defenseCheck(attacker.defense);
                
                if (reboundResult === 2) {
                    this.addLog(`${attacker.name} 再次反弹`, 'log-defend');
                    target.currentHp -= damage;
                    if (target.isCharging) {
                        target.isCharging = false;
                        this.addLog(`${target.name} 的蓄力被打断`, 'log-warning');
                    }
                } else if (reboundResult === 1) {
                    this.addLog(`${attacker.name} 防御成功`, 'log-defend');
                } else {
                    attacker.currentHp -= damage;
                }
                break;
            default: // 防御失败
                target.currentHp -= damage;
                if (target.isCharging) {
                    target.isCharging = false;
                    this.addLog(`${target.name} 的蓄力被打断`, 'log-warning');
                }
                break;
        }
        
        this.checkDeath(target);
        if (attacker.currentHp <= 0) {
            this.checkDeath(attacker);
        }
    }
    
    // 处理燃烧伤害
    async processBurnDamage() {
        this.characters.forEach(char => {
            if (char.isAlive && char.isBurning && char.burnDamage > 0) {
                const burnDmg = Math.floor(char.burnDamage * 0.4);
                if (burnDmg > 0) {
                    char.currentHp -= burnDmg;
                    this.addLog(`${char.name} 受到 ${burnDmg} 点燃烧伤害`, 'log-attack');
                    this.checkDeath(char);
                }
            }
        });
    }
    
    // 检查濒死状态
    checkCriticalHealth() {
        this.characters.forEach(char => {
            if (char.isAlive && !char.isCriticalHealth && 
                char.currentHp <= char.maxHp * 0.1) {
                char.isCriticalHealth = true;
                char.attack *= 2;
                char.defense = Math.min(120, char.defense * 2);
                char.magic = Math.min(80, char.magic * 2);
                this.addLog(`${char.name} 进入濒死状态，属性大幅提升`, 'log-special');
            }
        });
    }
    
    // 检查死亡
    checkDeath(character) {
        if (character.currentHp <= 0 && character.isAlive) {
            character.isAlive = false;
            character.currentHp = 0;
            this.addLog(`${character.name} 阵亡`, 'log-death');
        }
    }
    
    // 结束战斗
    endBattle() {
        this.isFighting = false;
        
        const winningTeam = new Set();
        this.characters.forEach(char => {
            if (char.isAlive) {
                winningTeam.add(char.team);
            }
        });
        
        if (winningTeam.size === 0) {
            this.addLog('全军覆没！', 'log-death');
        } else {
            const teamNumber = Array.from(winningTeam)[0];
            const winners = this.characters.filter(char => 
                char.isAlive && char.team === teamNumber
            );
            
            this.addLog('战斗结束！', 'log-special');
            this.addLog(`第 ${teamNumber} 队取得了胜利！`, 'log-special');
            this.addLog('胜利者：' + winners.map(w => w.name).join('、'), 'log-special');
        }
    }
    
    // 添加日志
    addLog(message, className = 'log-normal') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${className}`;
        logEntry.textContent = message;
        
        const logContainer = document.getElementById('battleLog');
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        this.battleLog.push({ message, className });
    }
    
    // 显示角色状态
    displayCharacterStats() {
        const statsPanel = document.getElementById('statsPanel');
        statsPanel.innerHTML = '';
        
        this.characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card';
            
            const hpPercent = Math.max(0, (char.currentHp / char.maxHp) * 100);
            const teamColor = this.getTeamColor(char.team);
            
            card.innerHTML = `
                <div class="character-name" style="color: ${teamColor}">
                    ${char.name} ${!char.isAlive ? '💀' : char.isCharging ? '⚡' : char.isBurning ? '🔥' : ''}
                </div>
                <div class="character-stats">
                    <div class="stat-item">
                        <span>HP:</span>
                        <span>${char.currentHp}/${char.maxHp}</span>
                    </div>
                    <div class="stat-item">
                        <span>攻击:</span>
                        <span>${char.attack}</span>
                    </div>
                    <div class="stat-item">
                        <span>暴击:</span>
                        <span>${char.critical}</span>
                    </div>
                    <div class="stat-item">
                        <span>防御:</span>
                        <span>${char.defense}</span>
                    </div>
                    <div class="stat-item">
                        <span>魔法:</span>
                        <span>${char.magic}</span>
                    </div>
                    <div class="stat-item">
                        <span>队伍:</span>
                        <span>${char.team}</span>
                    </div>
                </div>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${hpPercent}%"></div>
                </div>
            `;
            
            statsPanel.appendChild(card);
        });
    }
    
    // 获取队伍颜色
    getTeamColor(team) {
        const colors = ['#ffcc00', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#607D8B'];
        return colors[(team - 1) % colors.length];
    }
    
    // 清空输入
    clearInput() {
        document.getElementById('nameInput').value = '';
        document.getElementById('battleLog').innerHTML = '';
        document.getElementById('statsPanel').innerHTML = 
            '<div style="text-align: center; color: #888; padding: 20px;">战斗开始后，角色属性将显示在这里</div>';
        this.isFighting = false;
    }
    
    // 加载示例
    loadExample() {
        const example = `张三
李四
王五

91
78
13

ChatGPT
DeepSeek
DouBaoAI

ThisTeamHa_sOnly1Person`;
        document.getElementById('nameInput').value = example;
    }
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化名字竞技场
document.addEventListener('DOMContentLoaded', () => {
    new NameArena();
});
