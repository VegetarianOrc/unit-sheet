CONFIG.debug.hooks = true;

import ActorSheet5eCharacter from "../../../systems/dnd5e/module/actor/sheets/character.js";
import AncestryOptions from "./ancestry.js"
import ExperienceOptions from "./experience.js"
import EquipmentOptions from "./equipment.js"
import TypeOptions from "./unit_types.js"
import UnitTraits from "./traits.js"

const UNIT_NAMESPACE = "strongholds"
const UNIT_KEY = "values"

function DEBUG_LOG(...args) {
	console.log('Mazzeo---',...args);
}


class OptionMenu {
	constructor(unitSheet, optionName, optionValues, currentValue) {
		this.unitSheet = unitSheet;
		this.optionName = optionName;
		this.optionValues = optionValues;
		this.currentValue = this.currentValue;
		this.visible = false;
	}

	get element() {
		return this.unitSheet._element.find(`[data-menu-name=${this.optionName}]`);
	}

	get label() {
		return this.element.find('.keyword-label');
	}

	get options() {
		return this.element.find('.keyword-options')
	}

	setValue(value) {
		this.currentValue = value;
	}

	open() {
		if (this.visible) {return;}
		this.options.addClass('active');
		this.visible = true;
	}

	close() {
		if (!this.visible) {return;}
		this.options.removeClass('active');
		this.visible = false;
	}

}

class UnitSheet extends ActorSheet5eCharacter {
	constructor(...args) {
		super(...args);

		this.prepFlags()
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			width: 320,
			height: 322,
			resizable: false
		});
	}


	static get defaultUnitValues() {
		return {
			attributes: {
				attack: 0,
				power: 0,
				morale: 0,
				defense: 10,
				toughness: 10
			},
			selectedOptions: {
				ancestry: 'ghoul',
				experience: 'regular',
				equipment: 'medium',
				_type: 'infantry',
				size: '1d4'
			}
		}
	}

	get template() {
		return 'modules/strongholds/templates/unit.html';
	}

	get flags() {
		return this.actor.data.flags.strongholds;
	}

	async prepFlags() {
		let flags = this.flags;
		if (flags == undefined || flags == null || flags[UNIT_KEY] == undefined || flags[UNIT_KEY] == null) {
			await this.actor.setFlag(UNIT_NAMESPACE, UNIT_KEY, UnitSheet.defaultUnitValues);
		}
		return duplicate(this.flags);
	}


	activateListeners(html) {
		super.activateListeners(html);

		html.find('.keyword .keyword-label').focus( (event) => {
			event.preventDefault();
			let control = event.currentTarget.dataset.control;
			DEBUG_LOG('focus');
			Object.values(this.menus).forEach(menu => {
				if (menu.optionName === control) {
					menu.open();
				} else {
					menu.close();
				}
			});
		});


		html.find('.keyword').click(event => event.stopPropagation());

		html.click((event) => {
			Object.values(this.menus).forEach(menu => menu.close());
		});

		html.find('.keyword .keyword-options a').click((event) => {
			event.preventDefault();
			let category = event.currentTarget.dataset.keywordCategory;
			let value = event.currentTarget.dataset.keywordValue;
			DEBUG_LOG('click', 'category', category, 'value', value);
			this._updateSelectedOption(category, value);
			this.menus[category].close();
		});

		html.find('[data-roll-formula]').click(event => {
			event.preventDefault();
			let rollFormula = event.currentTarget.dataset.rollFormula;
			let roll = new Roll(rollFormula).roll();
			roll.toMessage({speaker: ChatMessage.getSpeaker({actor:this.actor})});
		});

	};


	async getData() {
		let sheetData = super.getData();

		sheetData.name = this.actor.name;


		let flags = duplicate(this.flags);

		DEBUG_LOG('getData', 'flags', flags);
		sheetData['showAncestryOpts'] = flags.showAncestryOpts ?? false;


		let existingData = flags[UNIT_KEY];
		if (existingData === undefined || existingData === null) {
			let defaults = UnitSheet.defaultUnitValues;
			sheetData.attributes = defaults.attributes

		}  else {
			sheetData.selectedOptions = existingData.selectedOptions;
			sheetData.attributes = this._prepareUnitAttributes(existingData.selectedOptions);
			sheetData.traits = this._prepareUnitTraits(existingData.selectedOptions);
		}

		this._prepMenus(sheetData.selectedOptions);
		sheetData.optMenus = this.menus;

		return sheetData;
	}

	async _updateSelectedOption(key, value) {
		let existingData = this.actor.getFlag(UNIT_NAMESPACE, UNIT_KEY);
		if (existingData === undefined || existingData === null) {
			existingData = UnitSheet.defaultUnitValues;
		}
		existingData.selectedOptions[key] = value;
		await this.actor.unsetFlag(UNIT_NAMESPACE,UNIT_KEY);
		return await this.actor.setFlag(UNIT_NAMESPACE, UNIT_KEY, existingData);
	}

	_prepareUnitAttributes(selectedOptions) {
		return {
				attack: this._calculateAttackBonus(selectedOptions),
				power: this._calculatePowerBonus(selectedOptions),
				morale: this._calculateMoraleBonus(selectedOptions),
				defense: this._calculateDefense(selectedOptions),
				toughness: this._calculateToughness(selectedOptions)
			};
	}

	_prepareUnitTraits(selectedOptions) {
		let ancestry = AncestryOptions[selectedOptions.ancestry];
		return ancestry.traits.map((traitName) => {
			return {
				label: traitName,
				description: UnitTraits[traitName].description
			};
		});
	}

	_calculateBonus(attrName, selectedOptions) {
		return AncestryOptions[selectedOptions.ancestry][attrName] +
			EquipmentOptions[selectedOptions.equipment][attrName] +
			ExperienceOptions[selectedOptions.experience][attrName] +
			TypeOptions[selectedOptions['_type']][attrName];
	}

	_calculateAttackBonus(selectedOptions) {
		return this._calculateBonus('attack', selectedOptions);
	}

	_calculatePowerBonus(selectedOptions) {
		return this._calculateBonus('power', selectedOptions);
	}

	_calculateMoraleBonus(selectedOptions) {
		return this._calculateBonus('morale', selectedOptions);
	}

	_calculateDefense(selectedOptions) {
		return 10 + this._calculateBonus('defense', selectedOptions);
	}

	_calculateToughness(selectedOptions) {
		return 10 + this._calculateBonus('toughness', selectedOptions);
	}

	_prepMenus(selectedOptions) {
		let safeOptions = selectedOptions || {};
		if (this.menus === undefined || this.menus === null) {
			this.menus = {
				'ancestry': new OptionMenu(this, 'ancestry', Object.keys(AncestryOptions), safeOptions['ancestry']),
				'experience': new OptionMenu(this, 'experience', Object.keys(ExperienceOptions), safeOptions['experience']),
				'equipment': new OptionMenu(this, 'equipment', Object.keys(EquipmentOptions), safeOptions['equipment']),
				'_type': new OptionMenu(this, '_type', Object.keys(TypeOptions), safeOptions['_type'])
			}
		}
		Object.keys(safeOptions).forEach(optName => {
			let menu = this.menus[optName];
			if (menu !== undefined && menu !== null)
			menu.setValue(safeOptions[optName]);
		});
	}

}

Actors.registerSheet("dnd5e", UnitSheet, {
	types: ['character'],
	makeDefault:false
});


Hooks.on('init', () => {
	Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
	    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
	});
	loadTemplates(['modules/strongholds/templates/unit.html']);
});