/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { TPromise } from 'vs/base/common/winjs.base';
import nls = require('vs/nls');
import * as Path from 'vs/base/common/paths';
import URI from 'vs/base/common/uri';
import * as Labels from 'vs/base/common/labels';
import * as Platform from 'vs/base/common/platform';
import { Action } from 'vs/base/common/actions';

import { Registry } from 'vs/platform/platform';
import { IWorkbenchActionRegistry, Extensions } from 'vs/workbench/common/actionRegistry';
import { IWorkbenchEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkspaceContextService } from 'vs/workbench/services/workspace/common/contextService';
import { IEditor } from 'vs/platform/editor/common/editor';
import { IFileService } from 'vs/platform/files/common/files';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';

import { IJSONContributionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContributionRegistry';
import { IJSONSchema } from 'vs/base/common/jsonSchema';



class ConfigureLocaleAction extends Action {
	public static ID = 'workbench.action.configureLocale';
	public static LABEL = nls.localize('configureLocale', "Configure Language");

	private static DEFAULT_CONTENT: string = [
		'{',
		`\t// ${nls.localize('displayLanguage', 'Defines VSCode\'s display language.')}`,
		`\t// ${nls.localize('doc', 'See {0} for a list of supported languages.', 'https://go.microsoft.com/fwlink/?LinkId=761051')}`,
		`\t// ${nls.localize('restart', 'Changing the value requires to restart VSCode.')}`,
		`\t"locale":"${Platform.language}"`,
		'}'
	].join('\n');

	constructor(id, label,
		@IFileService private fileService: IFileService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
		super(id, label);
	}

	public run(event?: any): TPromise<IEditor> {
		let file = URI.file(Path.join(this.contextService.getConfiguration().env.appSettingsHome, 'locale.json'));
		return this.fileService.resolveFile(file).then(null, (error) => {
			return this.fileService.createFile(file, ConfigureLocaleAction.DEFAULT_CONTENT);
		}).then((stat) => {
			if (!stat) {
				return;
			}
			return this.editorService.openEditor({
				resource: stat.resource,
				options: {
					forceOpen: true
				}
			});
		}, (error) => {
			throw new Error(nls.localize('fail.createSettings', "Unable to create '{0}' ({1}).", Labels.getPathLabel(file, this.contextService), error));
		});
	}
}

let workbenchActionsRegistry = <IWorkbenchActionRegistry>Registry.as(Extensions.WorkbenchActions);
workbenchActionsRegistry.registerWorkbenchAction(new SyncActionDescriptor(ConfigureLocaleAction, ConfigureLocaleAction.ID, ConfigureLocaleAction.LABEL), 'Configure Language');

let schemaId = 'vscode://schemas/locale';
// Keep en-US since we generated files with that content.
let schema : IJSONSchema =
{
	id: schemaId,
	description: 'Locale Definition file',
	type: 'object',
	default: {
		'locale': 'en'
	},
	required: ['locale'],
	properties: {
		locale: {
			type: 'string',
			enum: ['de', 'en', 'en-US', 'es', 'fr', 'it', 'ja', 'ko', 'ru', 'zh-CN', 'zh-tw'],
			description: nls.localize('JsonSchema.locale', 'The UI Language to use.')
		}
	}
};

let jsonRegistry = <IJSONContributionRegistry>Registry.as(JSONExtensions.JSONContribution);
jsonRegistry.registerSchema(schemaId, schema);