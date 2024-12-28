import { addActions, addFeedback } from "../../tools/tap-actions.ts";
import { createElement, toggleEntity, throttle, forwardHaptic, isEntityType, getAttribute } from "../../tools/utils.ts";

export function getButtonType(context) {
  let buttonType = context.config.button_type;

  if (buttonType === 'custom') {
    console.error('Buttons "custom" have been removed. Use either "switch", "slider", "state" or  "name"');
    buttonType = '';
  }

  if (context.config.entity) {
      return buttonType || 'switch';
  } else {
      return buttonType || 'name';
  }
}

export function updateEntity(context, value) {
  const state = context._hass.states[context.config.entity];
  const minValue = context.config.slider_config?.min ?? 0;
  const maxValue = context.config.slider_config?.max ?? 100;

  // Scale the value to the configured range
  const scaledValue = (maxValue - minValue) * (value / 100) + minValue;

  if (isEntityType(context, "light")) {
      context._hass.callService('light', 'turn_on', {
          entity_id: context.config.entity,
          brightness: Math.round(255 * value / 100)
      });
  } else if (isEntityType(context, "media_player")) {
      context._hass.callService('media_player', 'volume_set', {
          entity_id: context.config.entity,
          volume_level: (value / 100).toFixed(2)
      });
  } else if (isEntityType(context, "cover")) {
      context._hass.callService('cover', 'set_cover_position', {
          entity_id: context.config.entity,
          position: Math.round(value)
      });
  } else if (isEntityType(context, "input_number")) {
      const minValue = state.attributes.min ?? 0;
      const maxValue = state.attributes.max ?? 100;
      const step = getAttribute(context, "step") ?? 1;
      let rawValue = (maxValue - minValue) * value / 100 + minValue;
      let adjustedValue = Math.round(rawValue / step) * step;
      context._hass.callService('input_number', 'set_value', {
          entity_id: context.config.entity,
          value: adjustedValue
      });
  } else if (isEntityType(context, "fan")) {
      const step = state.attributes.percentage_step ?? 1;
      let adjustedValue = Math.round(value / step) * step;
      context._hass.callService('fan', 'set_percentage', {
          entity_id: context.config.entity,
          percentage: adjustedValue
      });
    } else if (isEntityType(context, "climate")) {
      const step = state.attributes.target_temp_step ?? 0.5;
      let adjustedValue = Math.round(scaledValue / step) * step;
      adjustedValue = parseFloat(adjustedValue.toFixed(1));
      context._hass.callService('climate', 'set_temperature', {
        entity_id: context.config.entity,
        temperature: adjustedValue
      });
    }
  } else if (isEntityType(context, "number")) {
      const minValue = state.attributes.min ?? 0;
      const maxValue = state.attributes.max ?? 100;
      const step = state.attributes.step ?? 1;
      let rawValue = (maxValue - minValue) * value / 100 + minValue;
      let adjustedValue = Math.round(rawValue / step) * step;
      context._hass.callService('number', 'set_value', {
          entity_id: context.config.entity,
          value: adjustedValue
      });
  }
}

export function onSliderChange(context, leftDistance) {
  const rect = context.elements.rangeSlider.getBoundingClientRect();
  const percentage = 100 * (leftDistance - rect.left) / rect.width;
  const rangedPercentage = Math.min(100, Math.max(0, percentage));

  // Get min/max values from config
  const minValue = context.config.slider_config?.min ?? 0;
  const maxValue = context.config.slider_config?.max ?? 100;

  // Scale the percentage to the configured range
  const scaledValue = (maxValue - minValue) * (rangedPercentage / 100) + minValue;
  const scaledPercentage = 100 * (scaledValue - minValue) / (maxValue - minValue);

  context.elements.rangeFill.style.transform = `translateX(${scaledPercentage}%)`;

  return scaledPercentage;
}
