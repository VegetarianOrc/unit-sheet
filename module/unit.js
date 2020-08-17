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

class UnitSheet extends ActorSheet5eCharacter {
	constructor(...args) {
		super(...args);

		this.prepFlags().then((flags) => {
			this.opts = this._prepareUnitOptions(flags);
		})

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
			this.actor.setFlag(UNIT_NAMESPACE, control+'-active', true)
		});

		html.click((event) => {
			DEBUG_LOG('blur');
			this.opts.forEach((opt) => {
				this.actor.unsetFlag(UNIT_NAMESPACE, opt.name+'-active');
			})
		});

		html.find('.keyword .keyword-options a').click((event) => {
			let category = event.currentTarget.dataset.keywordCategory;
			let value = event.currentTarget.dataset.keywordValue;
			DEBUG_LOG('click', 'category', category, 'value', value);
			this._updateSelectedOption(category, value);
			this.actor.unsetFlag(UNIT_NAMESPACE, category+'-active');
		});

		// ['ancestry', 'experience', 'equipment', '_type'].forEach((id) => {
		// 	html.find('#'+id).change(this._makeSelectListener(id));
		// });
	};


	async getData() {
		let sheetData = super.getData();


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

		let opts = this._prepareUnitOptions(flags);

		sheetData['opts'] = opts;

		return sheetData;
	}

	prepMenus() {

	}

	_makeSelectListener(id) {
		return async (event) => {
			return this._updateSelectedOption(id, event.target.value);
		};
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

	_prepareUnitOptions(flags) {
		let safeFlags = flags || {};
		return [
			{
				name: 'ancestry',
				options: Object.keys(AncestryOptions),
				selectable: safeFlags['ancestry-active'] ?? false
			},
			{
				name: 'experience',
				options: Object.keys(ExperienceOptions),
				selectable: safeFlags['experience-active'] ?? false
			},
			{
				name: 'equipment',
				options: Object.keys(EquipmentOptions),
				selectable: safeFlags['equipment-active'] ?? false
			},
			{
				name: '_type',
				options: Object.keys(TypeOptions),
				selectable: safeFlags['_type-active'] ?? false
			}
		]
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