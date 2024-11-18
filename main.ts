import {
	createDoc,
	getFolderlessLists,
	getFolders,
	getListsInFolder,
	getSpaces,
} from "api/api";
import { Location } from "enums/location.enum";
import { ParentDocType } from "enums/parent-type.enum";
import { Plugin, App, Modal, Setting, Notice, TFile } from "obsidian";
import { ModalResult } from "types/modal-result.type";

export default class EricClickup extends Plugin {
	async onload() {
		this.addCommand({
			id: "add-active-obsidian-note-as-a-clickup-doc",
			name: "Add active obsidian note as a clickup doc",
			callback: () => {
				new EricClickupModal(this.app, async (result) => {
					if (!result.activeFile) {
						new Notice("No active note was opened.");
					} else {
						const content = await this.app.vault.cachedRead(
							result.activeFile
						);
						// create clickup doc
						if (this.shouldCreateInSpace(result)) {
							await createDoc(
								result.spaceId,
								ParentDocType.Space,
								result.activeFile.basename,
								content
							);
							new Notice(
								`${result.activeFile.basename} was added`
							);
						}
					}
				}).open();
			},
		});
	}

	private shouldCreateInSpace(result: ModalResult): boolean {
		const { location, spaceId, folderId, listId } = result;
		return (
			location === Location.Space &&
			Boolean(spaceId) &&
			!folderId &&
			!listId
		);
	}
}

export class EricClickupModal extends Modal {
	// components
	private activeFileNameDisplay: Setting;
	private locationDropdown: Setting;
	private spaceDropdown: Setting;
	private folderDropdown: Setting;
	private listDropdown: Setting;
	private addButton: Setting;

	// class fields
	private activeFile: TFile | null = null;
	private location: Location = Location.Space;
	private selectedSpaceId: string = "";
	private selectedFolderId: string = "";
	private selectedListId: string = "";
	private onSubmit: (result: ModalResult) => void;

	constructor(app: App, onSubmit: (result: ModalResult) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setTitle("Add active obsidian note as a clickup doc");

		// Get the active file when the modal is opened
		this.activeFile = this.app.workspace.getActiveFile();

		// Create all components
		this.createActiveFileNameDisplay();
		this.createAllDropdowns();
		this.createAddButton();
	}

	private createActiveFileNameDisplay() {
		this.activeFileNameDisplay = new Setting(this.contentEl)
			.setName("Active note")
			.setDesc(
				this.activeFile
					? this.activeFile.name
					: "No active file. Please open a note and make sure the tab is selected to make it active."
			);
	}

	private createAllDropdowns() {
		this.createLocationDropdown();
		this.createSpaceDropdown();
		this.createFolderDropdown();
		this.createListDropdown();
		this.updateDropdownStates();
	}

	private createLocationDropdown() {
		this.locationDropdown = new Setting(this.contentEl)
			.setName("Location")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						[Location.Space]: "Space",
						[Location.Folder]: "Folder",
						[Location.ListInFolder]: "List inside a folder",
						[Location.FolderlessList]: "Folderless list",
						[Location.Task]: "Task (as relationship)",
					})
					.setValue(this.location)
					.onChange((v) => {
						this.location = v as Location;
						this.updateDropdownStates();
					});
			});
	}

	private createSpaceDropdown() {
		this.spaceDropdown = new Setting(this.contentEl)
			.setName("Space")
			.addDropdown(async (dropdown) => {
				const options = await getSpaces();
				dropdown
					.addOption("", "Select space")
					.addOptions(
						Object.fromEntries(
							options?.map((space: any) => [space.id, space.name])
						)
					)
					.setValue("")
					.onChange((value: string) => {
						this.selectedSpaceId = value;
						this.updateFolderOptions();
						this.updateListOptions();
						this.updateDropdownStates();
					});
			});
	}

	private createFolderDropdown() {
		this.folderDropdown = new Setting(this.contentEl)
			.setName("Folder")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select folder")
					.setValue("")
					.onChange((value: string) => {
						this.selectedFolderId = value;
						this.updateListOptions();
						this.updateDropdownStates();
					});
			});
	}

	private createListDropdown() {
		this.listDropdown = new Setting(this.contentEl)
			.setName("List")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("", "Select list")
					.setValue("")
					.onChange((value: string) => {
						this.selectedListId = value;
						this.updateDropdownStates();
					});
			});
	}

	private async updateFolderOptions() {
		if (!this.selectedSpaceId) return;

		const folderDropdownEl = this.folderDropdown?.components?.at(0) as any;
		folderDropdownEl.selectEl.empty();

		const options = await getFolders(this.selectedSpaceId);
		folderDropdownEl.addOption("", "Select folder");
		options?.forEach((folder: any) => {
			folderDropdownEl.addOption(folder.id, folder.name);
		});

		folderDropdownEl.setValue("");
		this.selectedFolderId = "";
	}

	private async updateListOptions() {
		if (!this.selectedSpaceId) return;

		const listDropdownEl = this.listDropdown?.components?.at(0) as any;
		listDropdownEl.selectEl.empty();

		let options;
		if (this.location === Location.ListInFolder && this.selectedFolderId) {
			options = await getListsInFolder(this.selectedFolderId);
		} else if (this.location === Location.FolderlessList) {
			options = await getFolderlessLists(this.selectedSpaceId);
		}

		listDropdownEl.addOption("", "Select list");
		options?.forEach((list: any) => {
			listDropdownEl.addOption(list.id, list.name);
		});

		listDropdownEl.setValue("");
		this.selectedListId = "";
	}

	private updateDropdownStates() {
		// Space dropdown is always enabled
		const spaceDropdownEl = this.spaceDropdown?.components?.at(0) as any;
		spaceDropdownEl?.setDisabled(false);

		// Folder dropdown state
		const folderDropdownEl = this.folderDropdown?.components?.at(0) as any;
		const shouldEnableFolder =
			(this.location === Location.Folder ||
				this.location === Location.ListInFolder) &&
			Boolean(this.selectedSpaceId);
		folderDropdownEl?.setDisabled(!shouldEnableFolder);

		// List dropdown state
		const listDropdownEl = this.listDropdown?.components?.at(0) as any;
		const shouldEnableList =
			(this.location === Location.ListInFolder &&
				Boolean(this.selectedFolderId)) ||
			(this.location === Location.FolderlessList &&
				Boolean(this.selectedSpaceId));
		listDropdownEl?.setDisabled(!shouldEnableList);

		this.updateAddButton();
	}

	private createAddButton() {
		this.addButton = new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText("Add")
				.setCta()
				.onClick(() => {
					this.close();
					const result: ModalResult = {
						activeFile: this.activeFile,
						location: this.location,
						spaceId: this.selectedSpaceId,
						folderId: this.selectedFolderId,
						listId: this.selectedListId,
					};
					this.onSubmit(result);
				})
		);
	}

	private updateAddButton() {
		const btn = this.addButton?.components?.at(0) as any;
		const isValid = this.isSelectionValid();
		btn?.setDisabled(!isValid);
	}

	private isSelectionValid(): boolean {
		if (!this.selectedSpaceId) return false;

		switch (this.location) {
			case Location.Space:
				return true;
			case Location.Folder:
				return Boolean(this.selectedFolderId);
			case Location.ListInFolder:
				return Boolean(this.selectedFolderId && this.selectedListId);
			case Location.FolderlessList:
				return Boolean(this.selectedListId);
			case Location.Task:
				return true; // Add your task validation logic here
			default:
				return false;
		}
	}
}
