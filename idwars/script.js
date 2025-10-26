class NameArena {
    constructor() {
        this.characters = [];
        this.teams = [];
        this.battleLog = [];
        this.isFighting = false;
        this.currentSpeed = 200; // 默认中等速度
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
    
    // 解析输入的名字
    parseNames(input) {
        const lines = input.split('\n');
        const teams = [];
        let currentTeam = [];
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                if (currentTeam.length > 0) {
                    teams.push([...currentTeam]);
                    currentTeam = [];
                }
            } else {
                currentTeam.push(trimmedLine);
            }
        });
        
        if (currentTeam.length > 0) {
            teams.push([...currentTeam]);
        }
        
        return teams;
    }

    // 初始化角色 - 修复版本
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
                
                // 修复属性计算 - 确保所有值都是有效数字
                const maxHp = 350 + (x[0] || 0) * (x[3] || 0) + 2 * (x[2] || 0) * (x[5] || 0);
                const attack = 15 + (x[1] || 0) + (x[4] || 0);
                const critical = (5 + ((m[2] || 0) % 8)) * 5;
                const defense = (5 + (m[4] || 0)) * 3;
                const magic = (((m[0] || 0) % 6) + ((m[5] || 0) % 6) + ((m[1] || 0) % 6)) * 3;
                
                this.characters.push({
                    id: id++,
                    name: name,
                    team: teamIndex + 1,
                    maxHp: Math.max(1, maxHp),
                    currentHp: Math.max(1, maxHp),
                    attack: Math.max(1, attack),
                    critical: Math.max(1, critical),
                    defense: Math.max(1, defense),
                    magic: Math.max(1, magic),
                    isAlive: true,
                    isCharging: false,
                    isBurning: false,
                    burnDamage: 0,
                    isCriticalHealth: false,
                    isCharmed: false, // 新增：魅惑状态
                    charmedTurns: 0,  // 新增：魅惑剩余回合数
                    originalTeam: teamIndex + 1 // 新增：原始队伍
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
        
        if (teams.length < 2) {
            this.addLog('至少需要2个队伍！', 'log-warning');
            return;
        }
        
        const emptyTeams = teams.filter(team => team.length === 0);
        if (emptyTeams.length > 0) {
            this.addLog('每个队伍至少需要1个人！', 'log-warning');
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
            
            let attacker = this.selectRandomAliveCharacter();
            while (attacker === lastAttacker) {
                attacker = this.selectRandomAliveCharacter();
            }
            lastAttacker = attacker;
            
            this.addLog(`第 ${this.round} 回合`, 'log-normal');
            this.addLog(`现在是 ${attacker.name} 的回合！`, 'log-special');
            
            await this.performAction(attacker);
            await this.delay(this.currentSpeed);
            
            await this.processBurnDamage();
            await this.delay(this.currentSpeed);
            
            this.checkCriticalHealth();
            this.displayCharacterStats();
            
            await this.delay(this.currentSpeed);
        }
    }
    
    // 选择随机存活的角色
    selectRandomAliveCharacter() {
        const aliveChars = this.characters.filter(char => char.isAlive);
        return aliveChars[Math.floor(Math.random() * aliveChars.length)];
    }
    
    // 执行行动 - 修复版本（修复魅惑状态计数）
    async performAction(attacker) {
        // 如果正在蓄力，则强制使用蓄力攻击
        if (attacker.isCharging) {
            await this.chargeAttack(attacker);
            // 蓄力攻击后减少魅惑回合数
            if (attacker.isCharmed) {
                attacker.charmedTurns--;
                if (attacker.charmedTurns <= 0) {
                    attacker.isCharmed = false;
                    attacker.team = attacker.originalTeam;
                    this.addLog(`${attacker.name} 的魅惑效果解除了`, 'log-normal');
                }
            }
            return;
        }
        
        const rand = Math.floor(Math.random() * 200) + 1;
        
        if (rand <= attacker.magic) {
            await this.useMagic(attacker);
        } else if (rand <= attacker.magic + attacker.critical) {
            await this.criticalAttack(attacker);
        } else {
            await this.normalAttack(attacker);
        }
        
        // 行动结束后减少魅惑回合数
        if (attacker.isCharmed) {
            attacker.charmedTurns--;
            if (attacker.charmedTurns <= 0) {
                attacker.isCharmed = false;
                attacker.team = attacker.originalTeam;
                this.addLog(`${attacker.name} 的魅惑效果解除了`, 'log-normal');
            }
        }
    }
    
    // 普通攻击
    async normalAttack(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        const damage = attacker.attack - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 攻击 ${target.name}，造成 ${damage} 点伤害`, 'log-attack');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 暴击攻击
    async criticalAttack(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        const damage = Math.floor(attacker.attack * 2.5) - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 暴击！对 ${target.name} 造成 ${damage} 点伤害`, 'log-critical');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 使用魔法
    async useMagic(attacker) {
        const magicType = Math.floor(Math.random() * 10); // 改为0-9，增加魅惑技能
        
        switch (magicType) {
            case 0:
                await this.healMagic(attacker);
                break;
            case 1:
                await this.heavyStrike(attacker);
                break;
            case 2:
                await this.freezeMagic(attacker);
                break;
            case 3:
                await this.buffMagic(attacker);
                break;
            case 4:
                await this.nukeMagic(attacker);
                break;
            case 5:
                await this.thunderMagic(attacker);
                break;
            case 6:
                await this.chargeAttack(attacker);
                break;
            case 7:
                await this.fireballMagic(attacker);
                break;
            case 8:
                await this.resurrectMagic(attacker);
                break;
            case 9:
                await this.charmMagic(attacker); // 新增：魅惑魔法
                break;
        }
    }
    
    // 治疗魔法
    async healMagic(attacker) {
        const ally = this.selectRandomAlly(attacker);
        const heal = Math.floor(ally.maxHp / 5) - 3 + Math.floor(Math.random() * 7);
        
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
        this.addLog(`${attacker.name} 治疗 ${ally.name}，回复 ${heal} 点 HP`, 'log-heal');
    }
    
    // 重创魔法
    async heavyStrike(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        const damage = attacker.attack * 5 - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 重创 ${target.name}，造成 ${damage} 点伤害！`, 'log-attack');
        
        await this.applyDamage(target, damage, attacker);
    }
    
    // 冰冻术
    async freezeMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        target.attack = Math.floor(target.attack * 0.67);
        target.defense = Math.floor(target.defense * 0.67);
        target.magic = Math.floor(target.magic * 0.67);
        
        this.addLog(`${attacker.name} 使用冰冻术，${target.name} 属性全面降低！`, 'log-magic');
    }
    
    // 属性提升
    async buffMagic(attacker) {
        attacker.attack = Math.floor(attacker.attack * 1.5);
        attacker.defense = Math.min(120, Math.floor(attacker.defense * 1.5));
        attacker.magic = Math.min(80, Math.floor(attacker.magic * 1.5));
        
        this.addLog(`${attacker.name} 属性全面提升！`, 'log-magic');
    }
    
    // 原子弹
    async nukeMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        target.currentHp = Math.floor(target.currentHp / 2);
        this.addLog(`${attacker.name} 扔出原子弹，${target.name} 的 HP 减少一半！`, 'log-special');
        
        if (target.isCharging) {
            target.isCharging = false;
            this.addLog(`${target.name} 的蓄力被打断了！`, 'log-warning');
        }
        
        this.checkDeath(target);
    }
    
    // 雷劈术
    async thunderMagic(attacker) {
        const damage = Math.floor(attacker.attack * 0.67) - 3 + Math.floor(Math.random() * 7);
        
        this.addLog(`${attacker.name} 使用雷劈术，对所有敌人造成 ${damage} 点伤害！`, 'log-magic');
        
        this.characters.forEach(char => {
            if (char.isAlive && char.team !== attacker.team) {
                char.currentHp -= damage;
                if (char.isCharging) {
                    char.isCharging = false;
                    this.addLog(`${char.name} 的蓄力被打断了！`, 'log-warning');
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
            if (!target) return;
            
            const damage = attacker.attack * 24 - 3 + Math.floor(Math.random() * 7);
            
            this.addLog(`${attacker.name} 蓄力完成，打出了会心一击，对 ${target.name} 造成 ${damage} 点无法抵挡的伤害！！`, 'log-critical');
            
            target.currentHp -= damage;
            if (target.isCharging) {
                target.isCharging = false;
                this.addLog(`${target.name} 的蓄力被打断了！`, 'log-warning');
            }
            this.checkDeath(target);
        }
    }
    
    // 火球术
    async fireballMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        const damage = Math.floor(attacker.attack * 3) - 3 + Math.floor(Math.random() * 7);
        
        target.isBurning = true;
        target.burnDamage = damage;
        target.currentHp -= damage;
        
        this.addLog(`${attacker.name} 对 ${target.name} 扔出火球，造成 ${damage} 点伤害并点燃！`, 'log-attack');
        
        if (target.isCharging) {
            target.isCharging = false;
            this.addLog(`${target.name} 的蓄力被打断了！`, 'log-warning');
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
            target.burnDamage = 0;
            target.isCriticalHealth = false; // 清除濒死状态
            target.isCharmed = false; // 清除魅惑状态
            target.charmedTurns = 0;
            target.team = target.originalTeam; // 恢复原始队伍
            
            // 重置属性到初始值（避免濒死状态的影响）
            this.resetCharacterStats(target);
            
            this.addLog(`${attacker.name} 复活了 ${target.name}！`, 'log-heal');
        } else {
            this.addLog(`${attacker.name} 试图复活队友，但没有目标`, 'log-warning');
        }
    }
    
    // 修改后的魅惑魔法 - 添加队伍人数检查
    async charmMagic(attacker) {
        const target = this.selectRandomEnemy(attacker);
        if (!target) return;
        
        // 检查目标原始队伍中存活的人数
        const aliveInTargetTeam = this.characters.filter(char => 
            char.isAlive && char.originalTeam === target.originalTeam
        ).length;
        
        // 如果目标队伍只有一人，魅惑失败
        if (aliveInTargetTeam <= 1) {
            this.addLog(`${attacker.name} 试图魅惑 ${target.name}，但 ${target.name} 的队伍只剩一人，魅惑失败！`, 'log-warning');
            return;
        }
        
        target.isCharmed = true;
        target.charmedTurns = 2; // 持续2回合
        target.team = attacker.team; // 暂时加入攻击者的队伍
            
        this.addLog(`${attacker.name} 使用魅惑术，${target.name} 被魅惑了！接下来的2回合将攻击队友`, 'log-magic');
    }
    
    // 新增：重置角色属性到初始值
    resetCharacterStats(character) {
        const hash1 = this.hash1(character.name);
        const hash2 = this.hash2(character.name);
        
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
        
        // 重新计算基础属性
        character.maxHp = 350 + (x[0] || 0) * (x[3] || 0) + 2 * (x[2] || 0) * (x[5] || 0);
        character.attack = 15 + (x[1] || 0) + (x[4] || 0);
        character.critical = (5 + ((m[2] || 0) % 8)) * 5;
        character.defense = (5 + (m[4] || 0)) * 3;
        character.magic = (((m[0] || 0) % 6) + ((m[5] || 0) % 6) + ((m[1] || 0) % 6)) * 3;
        
        // 确保属性至少为1
        character.maxHp = Math.max(1, character.maxHp);
        character.attack = Math.max(1, character.attack);
        character.critical = Math.max(1, character.critical);
        character.defense = Math.max(1, character.defense);
        character.magic = Math.max(1, character.magic);
    }
    
    // 选择随机敌人 - 修改版：考虑魅惑状态
    selectRandomEnemy(attacker) {
        let enemies;
        
        if (attacker.isCharmed) {
            // 如果被魅惑，将队友视为敌人
            enemies = this.characters.filter(char => 
                char.isAlive && char.team === attacker.originalTeam && char.id !== attacker.id
            );
        } else {
            // 正常情况：选择不同队伍的敌人
            enemies = this.characters.filter(char => 
                char.isAlive && char.team !== attacker.team
            );
        }
        
        return enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)] : null;
    }
    
    // 选择随机队友 - 修改版：考虑魅惑状态
    selectRandomAlly(attacker) {
        let allies;
        
        if (attacker.isCharmed) {
            // 如果被魅惑，将敌人视为队友
            allies = this.characters.filter(char => 
                char.isAlive && char.team !== attacker.originalTeam && char.id !== attacker.id
            );
        } else {
            // 正常情况：选择同队伍的队友
            allies = this.characters.filter(char => 
                char.isAlive && char.team === attacker.team && char.id !== attacker.id
            );
        }
        
        return allies.length > 0 ? 
            allies[Math.floor(Math.random() * allies.length)] : attacker;
    }
    
    // 应用伤害
    async applyDamage(target, damage, attacker) {
        const defenseResult = this.defenseCheck(target.defense);
        
        switch (defenseResult) {
            case 1:
                this.addLog(`${target.name} 防御成功`, 'log-defend');
                break;
            case 2:
                this.addLog(`${target.name} 反弹伤害`, 'log-defend');
                const reboundResult = this.defenseCheck(attacker.defense);
                
                if (reboundResult === 2) {
                    this.addLog(`${attacker.name} 再次反弹`, 'log-defend');
                    target.currentHp -= damage;
                    if (target.isCharging) {
                        target.isCharging = false;
                        this.addLog(`${target.name} 的蓄力被打断了！`, 'log-warning');
                    }
                } else if (reboundResult === 1) {
                    this.addLog(`${attacker.name} 防御成功`, 'log-defend');
                } else {
                    attacker.currentHp -= damage;
                }
                break;
            default:
                target.currentHp -= damage;
                if (target.isCharging) {
                    target.isCharging = false;
                    this.addLog(`${target.name} 的蓄力被打断了！`, 'log-warning');
                }
                break;
        }
        
        this.checkDeath(target);
        if (attacker.currentHp <= 0) {
            this.checkDeath(attacker);
        }
    }
    
    // 处理燃烧伤害 - 修复版本
    async processBurnDamage() {
        this.characters.forEach(char => {
            if (char.isAlive && char.isBurning && char.burnDamage > 0) {
                // 计算当前回合的燃烧伤害
                const burnDmg = Math.floor(char.burnDamage * 0.4);
                
                if (burnDmg > 0) {
                    char.currentHp -= burnDmg;
                    this.addLog(`${char.name} 受到 ${burnDmg} 点燃烧伤害`, 'log-attack');
                    this.checkDeath(char);
                    
                    // 更新燃烧伤害为下一回合的值（乘以0.4并向下取整）
                    char.burnDamage = Math.floor(char.burnDamage * 0.4);
                    
                    // 如果下一回合的燃烧伤害为0，清除燃烧状态
                    if (char.burnDamage <= 0) {
                        char.isBurning = false;
                        char.burnDamage = 0;
                        this.addLog(`${char.name} 的燃烧效果消失了`, 'log-normal');
                    }
                } else {
                    // 如果当前燃烧伤害为0，清除燃烧状态
                    char.isBurning = false;
                    char.burnDamage = 0;
                    this.addLog(`${char.name} 的燃烧效果消失了`, 'log-normal');
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
                this.addLog(`${char.name} 进入濒死状态，属性大幅提升！`, 'log-special');
            }
        });
    }
    
    // 检查死亡
    checkDeath(character) {
        if (character.currentHp <= 0 && character.isAlive) {
            character.isAlive = false;
            character.currentHp = 0;
            character.isCharging = false;
            character.isBurning = false;
            character.isCharmed = false;
            character.charmedTurns = 0;
            character.team = character.originalTeam; // 恢复原始队伍
            this.addLog(`${character.name} 阵亡`, 'log-death');
        }
    }
    
    // 结束战斗
    endBattle() {
        this.isFighting = false;
        
        const winningTeam = new Set();
        this.characters.forEach(char => {
            if (char.isAlive) {
                winningTeam.add(char.originalTeam); // 使用原始队伍判断胜利
            }
        });
        
        if (winningTeam.size === 0) {
            this.addLog('全军覆没！', 'log-death');
        } else {
            const teamNumber = Array.from(winningTeam)[0];
            const winners = this.characters.filter(char => 
                char.isAlive && char.originalTeam === teamNumber
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
            const teamColor = this.getTeamColor(char.originalTeam); // 使用原始队伍颜色
            
            let statusIcons = '';
            if (!char.isAlive) statusIcons += '💀';
            if (char.isCharging) statusIcons += '⚡';
            if (char.isBurning) statusIcons += '🔥';
            if (char.isCharmed) statusIcons += '💖';
            
            card.innerHTML = `
                <div class="character-name" style="color: ${teamColor}">
                    ${char.name} ${statusIcons}
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
                        <span>${char.originalTeam}${char.isCharmed ? '(被魅惑)' : ''}</span>
                    </div>
                </div>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${hpPercent}%"></div>
                </div>
            `;
            
            statsPanel.appendChild(card);
        });
    }
    
    // 获取队伍颜色 - 真正随机版本
    getTeamColor(team) {
        // 生成鲜艳的随机颜色
        const hue = (team * 137.5) % 360; // 使用黄金角度来获得均匀分布的颜色
        const saturation = 70 + Math.random() * 20; // 70-90% 饱和度
        const lightness = 50 + Math.random() * 10; // 50-60% 亮度
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
