import { Location } from "enums/location.enum";
import { TFile } from "obsidian";

export interface ModalResult {
	activeFile: TFile | null;
	location: Location;
	spaceId: string;
	folderId: string;
	listId: string;
	taskId?: string;
}
