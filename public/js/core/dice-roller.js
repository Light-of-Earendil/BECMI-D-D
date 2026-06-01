/**
 * Animated dice roller ported from the source HTML + Stylus dice system in
 * Creatures & Chronicles. JavaScript only mounts templates, toggles runtime
 * classes, sets data-face/data-before, and manages timing/audio.
 */

class BECMIDiceAudio {
    constructor() {
        this.rollSounds = [
            'audio/dice/dieroll1.mp3',
            'audio/dice/dieroll2.mp3',
            'audio/dice/dieroll3.mp3',
            'audio/dice/dieroll4.mp3',
            'audio/dice/dieroll5.mp3'
        ];

        this.effectSounds = {
            swoosh: 'audio/effects/torch-swoosh.mp3',
            lock: 'audio/effects/lock-it-in.mp3',
            success: 'audio/effects/success.mp3',
            failure: 'audio/effects/fail.mp3'
        };
    }

    playRandomRoll() {
        const sound = this.rollSounds[Math.floor(Math.random() * this.rollSounds.length)];
        this.play(sound, 0.55);
    }

    playSwoosh() {
        this.play(this.effectSounds.swoosh, 0.45);
    }

    playLock() {
        this.play(this.effectSounds.lock, 0.55);
    }

    playSuccess() {
        this.play(this.effectSounds.success, 0.55);
    }

    playFailure() {
        this.play(this.effectSounds.failure, 0.55);
    }

    play(path, volume = 0.7) {
        try {
            const audio = new Audio(path);
            audio.volume = volume;
            const playback = audio.play();

            if (playback && typeof playback.catch === 'function') {
                playback.catch(() => {});
            }
        } catch (error) {
            if (window.__BECMI_DEBUG__) {
                console.warn('Dice audio playback skipped:', error);
            }
        }
    }
}

class DiceRoller {
    constructor(app) {
        this.app = app;
        this.audio = new BECMIDiceAudio();
        this.activeRollPromise = null;
        this.overlayId = 'becmi-dice-overlay';
        this.supportedSides = [4, 6, 8, 10, 12, 20];
        this.overlayFadeMs = 400;
        this.standardDieTiming = {
            animationDelay: 750,
            transitionDuration: 1750
        };
        this.d20Timing = {
            animationDelay: 1000,
            transitionDuration: 2000
        };
        this.multipleStaggerMs = 300;
        this.multipleHoldMs = 2000;
    }

    init() {
        this.ensureOverlay();
    }

    ensureOverlay() {
        if (document.getElementById(this.overlayId)) {
            return;
        }

        $('body').append(this.getOverlayMarkup());
    }

    getOverlayMarkup() {
        return `
            <div id="${this.overlayId}" class="becmi-dice-overlay" aria-hidden="true">
                <div class="becmi-dice-overlay__scrim"></div>
                <div class="becmi-dice-stage">
                    <div id="dices" class="diecontainer box" style="display: none;">
                        <div id="diceTitle"></div>
                        <div class="diebox">
                            ${this.getSingleDieTemplatesMarkup()}
                        </div>
                        <div id="initModifier"></div>
                        <div id="diceText"></div>
                    </div>
                    <div id="becmi-multiple-dice" class="multiple-dice-container box" style="display: none;">
                        <div class="multiple-dice-title"></div>
                        <div class="multiple-dice-modifier"></div>
                        <div class="multiple-dice-box"></div>
                        <div class="multiple-dice-total"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getSingleDieTemplatesMarkup() {
        return `
            <div class="die died4 wood" id="died4">
                <figure class="face face-1" data-before="2" data-after="3" data-face="1">1</figure>
                <figure class="face face-2" data-before="3" data-after="4" data-face="2">2</figure>
                <figure class="face face-3" data-before="4" data-after="3" data-face="1">1</figure>
                <figure class="face face-4" data-before="3" data-after="2" data-face="4">4</figure>
            </div>
            <div class="die died6 wood" id="died6">
                <figure class="face face-1" data-before="1"></figure>
                <figure class="face face-2" data-before="2"></figure>
                <figure class="face face-3" data-before="3"></figure>
                <figure class="face face-4" data-before="4"></figure>
                <figure class="face face-5" data-before="5"></figure>
                <figure class="face face-6" data-before="6"></figure>
            </div>
            <div class="die died8 wood" id="died8">
                <figure class="face face-1" data-before="1"></figure>
                <figure class="face face-2" data-before="2"></figure>
                <figure class="face face-3" data-before="3"></figure>
                <figure class="face face-4" data-before="4"></figure>
                <figure class="face face-5" data-before="5"></figure>
                <figure class="face face-6" data-before="6"></figure>
                <figure class="face face-7" data-before="7"></figure>
                <figure class="face face-8" data-before="8"></figure>
            </div>
            <div class="die died10 wood" id="died10">
                <figure class="face face-1" data-before="1"></figure>
                <figure class="face face-2" data-before="2"></figure>
                <figure class="face face-3" data-before="3"></figure>
                <figure class="face face-4" data-before="4"></figure>
                <figure class="face face-5" data-before="5"></figure>
                <figure class="face face-6" data-before="6"></figure>
                <figure class="face face-7" data-before="7"></figure>
                <figure class="face face-8" data-before="8"></figure>
                <figure class="face face-9" data-before="9"></figure>
                <figure class="face face-10" data-before="0"></figure>
            </div>
            <div class="die died12 wood" id="died12">
                <figure class="face face-1" data-before="1"></figure>
                <figure class="face face-2" data-before="2"></figure>
                <figure class="face face-3" data-before="3"></figure>
                <figure class="face face-4" data-before="4"></figure>
                <figure class="face face-5" data-before="5"></figure>
                <figure class="face face-6" data-before="6"></figure>
                <figure class="face face-7" data-before="7"></figure>
                <figure class="face face-8" data-before="8"></figure>
                <figure class="face face-9" data-before="9"></figure>
                <figure class="face face-10" data-before="10"></figure>
                <figure class="face face-11" data-before="11"></figure>
                <figure class="face face-12" data-before="12"></figure>
            </div>
            <div class="die died20 wood" id="died20">
                <figure class="face face-1" data-before="1"></figure>
                <figure class="face face-2" data-before="2"></figure>
                <figure class="face face-3" data-before="3"></figure>
                <figure class="face face-4" data-before="4"></figure>
                <figure class="face face-5" data-before="5"></figure>
                <figure class="face face-6" data-before="6"></figure>
                <figure class="face face-7" data-before="7"></figure>
                <figure class="face face-8" data-before="8"></figure>
                <figure class="face face-9" data-before="9"></figure>
                <figure class="face face-10" data-before="10"></figure>
                <figure class="face face-11" data-before="11"></figure>
                <figure class="face face-12" data-before="12"></figure>
                <figure class="face face-13" data-before="13"></figure>
                <figure class="face face-14" data-before="14"></figure>
                <figure class="face face-15" data-before="15"></figure>
                <figure class="face face-16" data-before="16"></figure>
                <figure class="face face-17" data-before="17"></figure>
                <figure class="face face-18" data-before="18"></figure>
                <figure class="face face-19" data-before="19"></figure>
                <figure class="face face-20" data-before="20"></figure>
            </div>
        `;
    }

    getOverlay() {
        return $('#' + this.overlayId);
    }

    getSingleContainer() {
        return this.getOverlay().find('#dices');
    }

    getMultipleContainer() {
        return this.getOverlay().find('#becmi-multiple-dice');
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    fadeIn($element, duration = this.overlayFadeMs) {
        return new Promise(resolve => {
            $element.stop(true, true).fadeIn(duration, resolve);
        });
    }

    fadeOut($element, duration = this.overlayFadeMs) {
        return new Promise(resolve => {
            $element.stop(true, true).fadeOut(duration, resolve);
        });
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    escapeText(value) {
        return $('<div>').text(value === undefined || value === null ? '' : String(value)).html();
    }

    supportsSideCount(sides) {
        return this.supportedSides.includes(Number(sides));
    }

    formatModifierText(value) {
        const numeric = Number(value || 0);

        if (!numeric) {
            return '';
        }

        return numeric > 0 ? `+${numeric}` : `${numeric}`;
    }

    inferOutcome(sides, result, explicitOutcome = '') {
        if (explicitOutcome) {
            return explicitOutcome;
        }

        if (Number(sides) !== 20) {
            return '';
        }

        if (Number(result) === 20) {
            return 'critical';
        }

        if (Number(result) === 1) {
            return 'fumble';
        }

        return '';
    }

    parseExpression(expression) {
        const normalized = String(expression || '').replace(/\s+/g, '');
        const match = normalized.match(/^(?:(\d+))?d(\d+)([+-]\d+)?$/i);

        if (!match) {
            throw new Error(`Invalid dice expression: ${expression}`);
        }

        return {
            count: Math.max(1, parseInt(match[1] || '1', 10)),
            sides: parseInt(match[2], 10),
            bonus: match[3] ? parseInt(match[3], 10) : 0,
            expression: normalized
        };
    }

    formatExpression(parsed) {
        if (!parsed) {
            return '';
        }

        if (parsed.bonus > 0) {
            return `${parsed.count}d${parsed.sides}+${parsed.bonus}`;
        }

        if (parsed.bonus < 0) {
            return `${parsed.count}d${parsed.sides}${parsed.bonus}`;
        }

        return `${parsed.count}d${parsed.sides}`;
    }

    getDieElementId(sides) {
        return `died${parseInt(sides, 10)}`;
    }

    getDisplayModifier(config) {
        if (config.displayModifier !== undefined) {
            return Number(config.displayModifier || 0);
        }

        const rawSum = Array.isArray(config.dice)
            ? config.dice.reduce((sum, die) => sum + Number(die.result || 0), 0)
            : 0;

        return Number(config.total || 0) - rawSum;
    }

    getSingleDieTiming(sides) {
        return Number(sides) === 20 ? this.d20Timing : this.standardDieTiming;
    }

    getD20Highlight(outcome, result) {
        if (outcome === 'critical') {
            return 'critical';
        }

        if (outcome === 'fumble') {
            return 'fail';
        }

        if (!outcome && Number(result) === 20) {
            return 'critical';
        }

        if (!outcome && Number(result) === 1) {
            return 'fail';
        }

        return '';
    }

    buildTitleHtml(title, needed) {
        const escapedTitle = this.escapeText(title || 'Dice Roll');

        if (!needed) {
            return escapedTitle;
        }

        return `${escapedTitle}<div class="needed">(${this.escapeText(needed)})</div>`;
    }

    buildResultObject(config) {
        return {
            title: config.title,
            expression: config.expression,
            rolls: config.dice.map(die => die.result),
            subtotal: config.subtotal,
            total: config.total,
            modifier: config.modifier,
            needed: config.needed,
            text: config.text,
            outcome: config.outcome
        };
    }

    showOverlay() {
        this.getOverlay().addClass('is-visible').attr('aria-hidden', 'false');
    }

    hideOverlay() {
        this.getOverlay().removeClass('is-visible').attr('aria-hidden', 'true');
    }

    resetSingleContainer() {
        const $single = this.getSingleContainer();

        $single.find('.diebox').html(this.getSingleDieTemplatesMarkup());
        $single.find('#diceTitle').empty();
        $single.find('#initModifier').text('').css('top', '80px');
        $single.find('#diceText').text('');
        $single.find('.die').hide();
        $single.hide();
    }

    resetMultipleContainer() {
        const $multiple = this.getMultipleContainer();

        $multiple.find('.multiple-dice-title').empty();
        $multiple.find('.multiple-dice-modifier').text('').css('top', '80px');
        $multiple.find('.multiple-dice-box').empty();
        $multiple.find('.multiple-dice-total').empty();
        $multiple.hide();
    }

    async rollDie(options = {}) {
        const sides = parseInt(options.sides, 10);

        if (!Number.isFinite(sides) || sides < 2) {
            throw new Error(`Invalid die size: ${options.sides}`);
        }

        const modifier = Number(options.modifier || 0);
        const result = options.result !== null && options.result !== undefined
            ? parseInt(options.result, 10)
            : this.randomInt(1, sides);
        const config = {
            title: options.title || `Roll 1d${sides}`,
            needed: options.needed || '',
            text: options.text || `1d${sides}`,
            modifier,
            displayModifier: modifier,
            dice: [{ sides, result }],
            expression: `1d${sides}`,
            subtotal: result,
            total: result + modifier,
            outcome: this.inferOutcome(sides, result, options.outcome || '')
        };

        if (!this.supportsSideCount(sides)) {
            if (window.__BECMI_DEBUG__) {
                console.warn(`Animated dice renderer does not support d${sides} yet. Returning resolved roll without animation.`);
            }

            return this.buildResultObject(config);
        }

        return this.presentRoll(config);
    }

    async showResolvedRoll(options = {}) {
        return this.rollDie(options);
    }

    async rollExpression(options = {}) {
        const parsed = this.parseExpression(options.expression);
        const modifier = Number(options.modifier || 0);
        const providedRolls = Array.isArray(options.resolvedRolls) ? options.resolvedRolls : null;
        const rolls = (providedRolls && providedRolls.length ? providedRolls : Array.from(
            { length: parsed.count },
            () => this.randomInt(1, parsed.sides)
        )).map(roll => {
            const numeric = parseInt(roll, 10);

            if (!Number.isFinite(numeric)) {
                return 1;
            }

            return Math.min(parsed.sides, Math.max(1, numeric));
        });

        const rawSum = rolls.reduce((sum, roll) => sum + roll, 0);
        const subtotal = rawSum + parsed.bonus;
        const total = options.total !== null && options.total !== undefined
            ? Number(options.total)
            : subtotal + modifier;
        const config = {
            title: options.title || this.formatExpression(parsed),
            needed: options.needed || '',
            text: options.text || this.formatExpression(parsed),
            modifier,
            displayModifier: total - rawSum,
            dice: rolls.map(result => ({ sides: parsed.sides, result })),
            expression: this.formatExpression(parsed),
            subtotal,
            total,
            outcome: options.outcome || ''
        };

        if (!this.supportsSideCount(parsed.sides)) {
            if (window.__BECMI_DEBUG__) {
                console.warn(`Animated dice renderer does not support d${parsed.sides} yet. Returning resolved roll without animation.`);
            }

            return this.buildResultObject(config);
        }

        return this.presentRoll(config);
    }

    async presentRoll(config) {
        if (this.activeRollPromise) {
            return this.activeRollPromise;
        }

        const runner = config.dice.length > 1
            ? this.presentMultipleRoll(config)
            : this.presentSingleRoll(config);

        this.activeRollPromise = runner.finally(() => {
            this.activeRollPromise = null;
        });

        return this.activeRollPromise;
    }

    async presentSingleRoll(config) {
        this.ensureOverlay();
        this.resetMultipleContainer();
        this.resetSingleContainer();

        const die = config.dice[0];
        const sides = parseInt(die.sides, 10);
        const result = parseInt(die.result, 10);
        const timing = this.getSingleDieTiming(sides);
        const highlight = sides === 20 ? this.getD20Highlight(config.outcome, result) : '';
        const $single = this.getSingleContainer();
        const $die = $single.find(`#${this.getDieElementId(sides)}`);
        const $shownFace = $die.find(`.face-${result}`);
        const displayModifier = this.getDisplayModifier(config);

        $single.find('#diceTitle').html(this.buildTitleHtml(config.title, config.needed));
        $single.find('#initModifier').text(this.formatModifierText(displayModifier)).css('top', '80px');
        $single.find('#diceText').text(config.text || config.expression || '');
        $single.find('.die').hide();
        $shownFace.addClass('show');
        $die.show();

        this.audio.playRandomRoll();
        $die.addClass('rolling');
        this.showOverlay();
        const fadeInPromise = this.fadeIn($single);

        await this.wait(timing.animationDelay);

        if (sides !== 20) {
            $die.removeClass('rolling');
        }

        $die.attr('data-face', result);
        $die.find(`.face-${result}`).addClass('show');
        this.audio.playRandomRoll();

        await this.wait(500);

        $single.find('#initModifier').css('top', '200px');

        if (sides === 6 || sides === 10) {
            $shownFace.addClass('animate');
        }

        if (sides === 20) {
            $shownFace.addClass('animated');
            $single.find('.diebox').addClass('animated');

            if (highlight === 'critical') {
                $single.find('.diebox').addClass('critical');
            }

            if (highlight === 'fail') {
                $single.find('.diebox').addClass('fail');
            }
        }

        this.audio.playSwoosh();

        await this.wait(500);

        $shownFace.attr('data-before', config.total);
        $single.find('#initModifier').text('').css('top', '80px');
        $shownFace.addClass('big');
        this.audio.playLock();

        if (sides === 20) {
            setTimeout(() => {
                if (highlight === 'critical') {
                    this.audio.playSuccess();
                }

                if (highlight === 'fail') {
                    this.audio.playFailure();
                }
            }, 200);
        }

        await this.wait(Math.max(0, timing.transitionDuration - 1000));
        await fadeInPromise;
        await this.fadeOut($single);

        this.resetSingleContainer();
        this.hideOverlay();

        return this.buildResultObject(config);
    }

    async animateMultipleDie($die, finalValue) {
        $die.addClass('rolling');

        const animationDuration = 1000 + (Math.random() * 1000);
        await this.wait(animationDuration);

        $die.removeClass('rolling');
        $die.attr('data-face', finalValue);
        $die.find('.face').removeClass('show');
        $die.find(`.face-${finalValue}`).addClass('show');

        this.audio.playRandomRoll();
        await this.wait(500);
    }

    async presentMultipleRoll(config) {
        this.ensureOverlay();
        this.resetSingleContainer();
        this.resetMultipleContainer();

        const $single = this.getSingleContainer();
        const $multiple = this.getMultipleContainer();
        const $box = $multiple.find('.multiple-dice-box');
        const sides = parseInt(config.dice[0].sides, 10);
        const templateId = this.getDieElementId(sides);
        const displayModifier = this.getDisplayModifier(config);

        $multiple.find('.multiple-dice-title').text(config.title || 'Dice Roll');
        $multiple.find('.multiple-dice-modifier').text(this.formatModifierText(displayModifier)).css('top', '80px');
        $multiple.find('.multiple-dice-total').text(`Total: ${config.total}`);

        config.dice.forEach((die, index) => {
            const result = parseInt(die.result, 10);
            const $template = $single.find(`#${templateId}`).clone();

            $template.attr('id', `becmi-multiple-die-${sides}-${index}`);
            $template.addClass('multiple-die');
            $template.find('.face').removeClass('show big animate animated');
            $template.attr('data-face', result);
            $template.find(`.face-${result}`).addClass('show');
            $template.show();

            $box.append($template);
        });

        this.audio.playRandomRoll();
        this.showOverlay();
        const fadeInPromise = this.fadeIn($multiple);

        const tasks = [];
        const $dice = $box.find('.multiple-die');

        $dice.each((index, element) => {
            tasks.push((async () => {
                await this.wait(index * this.multipleStaggerMs);
                await this.animateMultipleDie($(element), parseInt(config.dice[index].result, 10));
            })());
        });

        await Promise.all(tasks);
        await this.wait(this.multipleHoldMs);
        await fadeInPromise;
        await this.fadeOut($multiple);

        this.resetMultipleContainer();
        this.resetSingleContainer();
        this.hideOverlay();

        return this.buildResultObject(config);
    }
}

window.DiceRoller = DiceRoller;
